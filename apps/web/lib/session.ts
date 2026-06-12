// Demo-grade session (go-live weekend): a signed-out cookie carrying the
// journalist slug. Real authentication (NextAuth, passwords/SSO) replaces
// this post-launch; every consumer reads through these helpers so the swap
// is one file.
import { cookies } from "next/headers";

const COOKIE = "oj_user";

export async function sessionSlug(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setSessionSlug(slug: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// Each role's natural room (ADR 0053).
export function roomForRole(role: string | null, slug: string): string {
  switch (role) {
    case "Digital Desk":
      return "scores";
    case "Data Journalist":
      return "trends";
    case "News Editor":
      return "potential";
    case "Bureau Chief":
      return "gaps";
    case "Editor":
      return "coverage";
    default:
      return `feed/${slug}`;
  }
}
