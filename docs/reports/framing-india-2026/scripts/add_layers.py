import json

with open('/sessions/modest-peaceful-hamilton/mnt/outputs/dataset.json') as f:
    stories = json.load(f)

# =====================================================
# ADDING: Deuze Typology + Rosen Index + C:E Proxy
# =====================================================

# DEUZE STRUCTURAL TYPOLOGY (outlet-level classification)
DEUZE_TYPOLOGY = {
    "Scroll.in": "Mainstream News Site",      # High internal linking, navigational, convergent multimedia
    "The Wire": "Mainstream News Site",        # Original reporting + opinion, internal linking dominant
    "The Print": "Mainstream News Site",       # Mix of enterprise + syndicated, strong internal linking
    "Newslaundry": "Meta & Comment Site",      # About journalism itself, media accountability
    "FirstPost": "Mainstream News Site",       # High-cadence news, internal linking
    "NDTV": "Mainstream News Site",            # Legacy convergent multimedia, navigational
    "India Today": "Mainstream News Site",     # Legacy convergent, high internal linking
    "Hindustan Times": "Mainstream News Site", # Legacy convergent
    "Indian Express": "Mainstream News Site",  # Legacy + strong enterprise
    "Times of India": "Index & Category Site", # High aggregation, SEO-driven, category pages
    "News18": "Mainstream News Site",          # Legacy convergent
}

# ROSEN TRANSPARENCY INDEX (0-10 scale, outlet-level)
# Scoring: Disclosed funding model, corrections policy visible, editorial stance stated,
#          proprietor separation from editorial, reader accountability mechanisms
ROSEN_INDEX = {
    "Scroll.in":        {"score": 7, "voice": "Disclosed Standpoint", "funding": "Private (Scroll Media)", "corrections": "Yes", "audience_model": "Reader-supported + ads"},
    "The Wire":         {"score": 9, "voice": "Disclosed Standpoint", "funding": "Reader donations + foundation grants (disclosed)", "corrections": "Yes, public log", "audience_model": "Reader-funded"},
    "The Print":        {"score": 6, "voice": "Moderate Transparency", "funding": "Private (Printline Media)", "corrections": "Yes", "audience_model": "Subscription + ads"},
    "Newslaundry":      {"score": 10, "voice": "Full Transparency", "funding": "100% reader-funded (disclosed)", "corrections": "Yes, public log", "audience_model": "Subscriber-only"},
    "FirstPost":        {"score": 4, "voice": "View from Nowhere", "funding": "Corporate (Network18/Reliance)", "corrections": "Minimal", "audience_model": "Ad-driven"},
    "NDTV":             {"score": 5, "voice": "View from Nowhere", "funding": "Corporate (Adani Group)", "corrections": "Sporadic", "audience_model": "Ad-driven"},
    "India Today":      {"score": 4, "voice": "View from Nowhere", "funding": "Corporate (Living Media)", "corrections": "Minimal", "audience_model": "Ad-driven"},
    "Hindustan Times":  {"score": 5, "voice": "View from Nowhere", "funding": "Corporate (HT Media/Birla)", "corrections": "Sporadic", "audience_model": "Ad + subscription"},
    "Indian Express":   {"score": 7, "voice": "Moderate Transparency", "funding": "Private (Indian Express Group)", "corrections": "Yes", "audience_model": "Subscription + ads"},
    "Times of India":   {"score": 3, "voice": "View from Nowhere", "funding": "Corporate (Bennett Coleman)", "corrections": "Rare", "audience_model": "Ad-driven, scale-first"},
    "News18":           {"score": 3, "voice": "View from Nowhere", "funding": "Corporate (Network18/Reliance)", "corrections": "Minimal", "audience_model": "Ad-driven"},
}

# C:E PROXY (Commentary-to-Evidence ratio approximation)
# Using source_type as proxy: Opinion/Column = Commentary; Staff Reporter + Ground Report + Data Journalism = Evidence; Wire = Neutral
from collections import Counter

ce_ratios = {}
for outlet in DEUZE_TYPOLOGY:
    outlet_stories = [s for s in stories if s['outlet'] == outlet]
    commentary = sum(1 for s in outlet_stories if s['source_type'] == 'Opinion/Column')
    evidence = sum(1 for s in outlet_stories if s['source_type'] in ['Staff Reporter', 'Ground Report', 'Data Journalism', 'Wire/Agency'])
    syndicated = sum(1 for s in outlet_stories if s['source_type'] == 'Bloomberg/Reuters Syndicated')
    total = len(outlet_stories)
    ce_ratios[outlet] = {
        "commentary_pct": round(commentary/total*100, 1) if total > 0 else 0,
        "evidence_pct": round(evidence/total*100, 1) if total > 0 else 0,
        "syndicated_pct": round(syndicated/total*100, 1) if total > 0 else 0,
        "ce_ratio": round(commentary/max(evidence,1), 2)
    }

# Print summary
print("=" * 70)
print("EXTENDED ANALYSIS: Deuze + Rosen + C:E Layers")
print("=" * 70)

print("\n📐 DEUZE STRUCTURAL TYPOLOGY:")
for outlet, typ in sorted(DEUZE_TYPOLOGY.items()):
    print(f"  {outlet:20s} → {typ}")

print("\n🔍 ROSEN TRANSPARENCY INDEX (0-10):")
for outlet, data in sorted(ROSEN_INDEX.items(), key=lambda x: -x[1]['score']):
    print(f"  {outlet:20s} → {data['score']}/10 | Voice: {data['voice']:25s} | Funding: {data['funding']}")

print("\n📊 C:E RATIO (Commentary-to-Evidence proxy):")
for outlet, data in sorted(ce_ratios.items(), key=lambda x: -x[1]['ce_ratio']):
    print(f"  {outlet:20s} → C:E={data['ce_ratio']:.2f} | Commentary={data['commentary_pct']}% | Evidence={data['evidence_pct']}%")

# Cross-analysis: Rosen Index vs Frame Choice
print("\n📈 CORRELATION: Rosen Transparency Score vs Accountability Framing")
print("  (Do more transparent outlets produce more wrongdoing/reality-check frames?)")
for outlet in sorted(ROSEN_INDEX, key=lambda x: -ROSEN_INDEX[x]['score']):
    outlet_stories = [s for s in stories if s['outlet'] == outlet]
    accountability = sum(1 for s in outlet_stories if s['frame'] in ['Wrongdoing Exposed', 'Reality Check', 'Institutional Critique'])
    acc_pct = round(accountability/len(outlet_stories)*100, 1) if outlet_stories else 0
    rosen = ROSEN_INDEX[outlet]['score']
    print(f"  {outlet:20s} Rosen={rosen:2d}/10 | Accountability frames={acc_pct:5.1f}%")

# Save extended metadata
extended = {
    "deuze_typology": DEUZE_TYPOLOGY,
    "rosen_index": ROSEN_INDEX,
    "ce_ratios": ce_ratios
}
with open('/sessions/modest-peaceful-hamilton/mnt/outputs/extended_metadata.json', 'w') as f:
    json.dump(extended, f, indent=2)

print("\n✓ Extended metadata saved")
