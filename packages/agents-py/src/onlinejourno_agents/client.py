"""LLM client — provider-agnostic.

The agents make single structured completions behind one seam:
`complete_json(system, user, model, max_tokens) -> Completion`. That seam is
the only thing the orchestrators depend on, so the provider behind it is
swappable (ADR 0040, superseding ADR 0004's Anthropic lock).

Supported providers:

- `anthropic` — Claude direct (default; Layer-1 default per ADR 0028).
- `openai`    — any OpenAI-compatible endpoint via `base_url`. Covers OpenAI,
  OpenRouter (→ Gemini, Mistral, Llama, DeepSeek, …), Together, Groq, and
  **self-hosted Ollama / vLLM** (no-Big-Tech, FOSS-trust option).

Selection is by env (see `provider_config_from_env`). Cost is computed from a
per-model price table with an env override; unknown / self-hosted models are
treated as untracked ($0) so a newsroom running a local model is never
blocked by the cost guard.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

# USD per million tokens (input, output). Verify against provider pricing when
# changing models. Models not listed are untracked ($0) unless LLM_PRICE_IN /
# LLM_PRICE_OUT are set. Keys are model ids as the provider expects them.
PRICING_PER_MTOK: dict[str, tuple[float, float]] = {
    "claude-sonnet-4-5": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
    "gpt-4o": (2.5, 10.0),
    "gpt-4o-mini": (0.15, 0.6),
    # Add more, or set LLM_PRICE_IN / LLM_PRICE_OUT for an unlisted cloud model.
    # Local models (Ollama / vLLM) are untracked ($0) — correct, no API cost.
}

Completer = Callable[..., "Completion"]


@dataclass(frozen=True, slots=True)
class Completion:
    """Result of one structured completion."""

    data: dict[str, Any]
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    cost_tracked: bool = True


@dataclass(frozen=True, slots=True)
class ProviderConfig:
    """How to reach the configured LLM. Built from env or passed explicitly."""

    provider: str  # "anthropic" | "openai"
    model: str
    api_key: str | None = None
    base_url: str | None = None
    price_in: float | None = None  # USD per Mtok input override
    price_out: float | None = None  # USD per Mtok output override


# Per-provider default model when LLM_MODEL is unset.
_DEFAULT_MODEL = {
    "anthropic": "claude-sonnet-4-5",
    "openai": "gpt-4o-mini",
}


def provider_config_from_env() -> ProviderConfig:
    """Read provider selection from the environment.

    LLM_PROVIDER   anthropic | openai           (default: anthropic)
    LLM_MODEL      model id                      (default: per-provider)
    LLM_BASE_URL   OpenAI-compatible base url    (openai provider; e.g. Ollama)
    LLM_API_KEY    generic key; falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY
    LLM_PRICE_IN   USD per Mtok input override   (for unlisted cloud models)
    LLM_PRICE_OUT  USD per Mtok output override
    """
    provider = (os.environ.get("LLM_PROVIDER") or "anthropic").strip().lower()
    if provider not in _DEFAULT_MODEL:
        raise ValueError(
            f"unknown LLM_PROVIDER {provider!r}; supported: {sorted(_DEFAULT_MODEL)}"
        )
    model = os.environ.get("LLM_MODEL") or (
        os.environ.get("ANTHROPIC_DEFAULT_MODEL") if provider == "anthropic" else None
    ) or _DEFAULT_MODEL[provider]

    if provider == "anthropic":
        api_key = os.environ.get("LLM_API_KEY") or os.environ.get("ANTHROPIC_API_KEY")
        base_url = None
    else:
        api_key = os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY")
        base_url = os.environ.get("LLM_BASE_URL") or os.environ.get("OPENAI_BASE_URL")

    def _f(name: str) -> float | None:
        v = os.environ.get(name)
        return float(v) if v not in (None, "") else None

    return ProviderConfig(
        provider=provider,
        model=model,
        api_key=api_key,
        base_url=base_url,
        price_in=_f("LLM_PRICE_IN"),
        price_out=_f("LLM_PRICE_OUT"),
    )


def compute_cost_usd(
    model: str,
    input_tokens: int,
    output_tokens: int,
    *,
    price_in: float | None = None,
    price_out: float | None = None,
) -> tuple[float, bool]:
    """Return (cost_usd, tracked). Untracked (unknown model, no override) -> (0.0, False).

    Local / self-hosted models are legitimately $0; an unknown cloud model is
    untracked until priced via the table or LLM_PRICE_IN / LLM_PRICE_OUT.
    """
    if price_in is not None and price_out is not None:
        rin, rout = price_in, price_out
    elif model in PRICING_PER_MTOK:
        rin, rout = PRICING_PER_MTOK[model]
    else:
        return 0.0, False
    return (input_tokens / 1_000_000) * rin + (output_tokens / 1_000_000) * rout, True


def parse_json_object(text: str) -> dict[str, Any]:
    """Parse a JSON object from model output, tolerating markdown fences/prose."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[-1]
        if stripped.rstrip().endswith("```"):
            stripped = stripped.rstrip()[:-3]
    stripped = stripped.strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end < start:
            raise
        return json.loads(stripped[start : end + 1])


def _anthropic_completer(cfg: ProviderConfig) -> Completer:
    from anthropic import Anthropic

    client = Anthropic(api_key=cfg.api_key)

    def complete_json(
        *, system: str, user: str, model: str | None = None, max_tokens: int = 1024
    ) -> Completion:
        chosen = model or cfg.model
        resp = client.messages.create(
            model=chosen,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = "".join(
            b.text for b in resp.content if getattr(b, "type", None) == "text"
        )
        data = parse_json_object(text)
        cost, tracked = compute_cost_usd(
            chosen, resp.usage.input_tokens, resp.usage.output_tokens,
            price_in=cfg.price_in, price_out=cfg.price_out,
        )
        return Completion(
            data, chosen, resp.usage.input_tokens, resp.usage.output_tokens, cost, tracked
        )

    return complete_json


def _openai_completer(cfg: ProviderConfig) -> Completer:
    from openai import OpenAI

    # Local servers (Ollama/vLLM) often need no real key; supply a placeholder.
    client = OpenAI(api_key=cfg.api_key or "not-needed", base_url=cfg.base_url)

    def complete_json(
        *, system: str, user: str, model: str | None = None, max_tokens: int = 1024
    ) -> Completion:
        chosen = model or cfg.model
        kwargs: dict[str, Any] = dict(
            model=chosen,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        try:
            resp = client.chat.completions.create(
                response_format={"type": "json_object"}, **kwargs
            )
        except Exception:
            # Some OpenAI-compatible servers reject response_format; the prompt
            # already demands bare JSON and parse_json_object is tolerant.
            resp = client.chat.completions.create(**kwargs)
        text = resp.choices[0].message.content or ""
        data = parse_json_object(text)
        usage = resp.usage
        in_tok = getattr(usage, "prompt_tokens", 0) or 0
        out_tok = getattr(usage, "completion_tokens", 0) or 0
        cost, tracked = compute_cost_usd(
            chosen, in_tok, out_tok, price_in=cfg.price_in, price_out=cfg.price_out
        )
        return Completion(data, chosen, in_tok, out_tok, cost, tracked)

    return complete_json


def make_completer(config: ProviderConfig | None = None) -> Completer:
    """Build the configured completer. Reads env when `config` is omitted."""
    cfg = config or provider_config_from_env()
    if cfg.provider == "anthropic":
        return _anthropic_completer(cfg)
    if cfg.provider == "openai":
        return _openai_completer(cfg)
    raise ValueError(f"unsupported provider {cfg.provider!r}")
