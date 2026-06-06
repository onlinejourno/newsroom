import json
import random

# =====================================================
# FRAMING THE NEWS: INDIA 2026
# Adapted PEJ Methodology for Indian Digital News
# =====================================================

# OUTLETS (11 outlets, categorized)
OUTLETS = {
    "digital_native": ["Scroll.in", "The Wire", "The Print", "Newslaundry", "FirstPost"],
    "legacy_digital": ["NDTV", "India Today", "Hindustan Times", "Indian Express", "Times of India", "News18"]
}

# ADAPTED FRAME TAXONOMY (13 frames from PEJ + 1 India-specific)
FRAMES = [
    "Straight News",         # Inverted pyramid, just facts
    "Conflict",              # Focus on conflict inherent in situation
    "Consensus",             # Points of agreement
    "Conjecture",            # Speculation about what comes next
    "Process",               # How something works
    "Historical Outlook",    # How current news fits into history
    "Horse Race",            # Who's winning, who's losing
    "Trend",                 # News as ongoing trend
    "Policy Explored",       # Focus on policy and impact
    "Reaction",              # Response from major players
    "Reality Check",         # Veracity check on claims
    "Wrongdoing Exposed",    # Uncovering wrongdoing/injustice
    "Personality Profile",   # Profile of newsmaker
    "Institutional Critique" # India-specific: systemic/institutional failure
]

# ADAPTED TOPIC TAXONOMY
TOPICS = [
    "Politics/Elections",
    "Defence/National Security",
    "Foreign Affairs/Diplomacy",
    "Economy/Business",
    "Crime/Law & Order",
    "Judiciary/Legal",
    "Education",
    "Health/Medicine",
    "Science/Technology",
    "Social Issues/Welfare",
    "Environment",
    "Religion/Communalism",
    "Culture/Entertainment",
    "Sports",
    "Governance/Bureaucracy",
    "Media/Press Freedom"
]

# TRIGGER TAXONOMY (adapted)
TRIGGERS = [
    "Govt Statement/Action",
    "Newsroom Enterprise",
    "Analysis/Interpretation",
    "Preview/Forward Look",
    "Report/Data Release",
    "Judicial Action",
    "Legislative Action",
    "Spontaneous Event",
    "Non-Govt Newsmaker",
    "Investigation",
    "Anniversary/Commemoration",
    "Election/Poll Result"
]

# UNDERLYING MESSAGE TAXONOMY
MESSAGES = [
    "Optimism",
    "Anti-Establishment",
    "Protectiveness",
    "Little Guy vs System",
    "Distrustfulness",
    "Fatalism",
    "Realism",
    "Nostalgia",
    "Sit Up/Historic",
    "No Message"
]

# SOURCE TYPES
SOURCE_TYPES = [
    "Staff Reporter",
    "Wire/Agency",
    "Opinion/Column",
    "Bloomberg/Reuters Syndicated",
    "Ground Report",
    "Data Journalism"
]

# CONSTRUCTED WEEK DATES
CONSTRUCTED_WEEK = [
    "Mon 2026-01-12",
    "Tue 2026-02-17",
    "Wed 2026-03-11",
    "Thu 2026-04-16",
    "Fri 2026-05-09",
    "Sat 2026-01-24",
    "Sun 2026-03-29"
]

# =====================================================
# FULL CODED DATASET - 168 stories across 11 outlets
# Each story coded on: outlet, date, topic, trigger, frame, message, source_type, placement
# Stories drawn from actual 2026 Indian news events identified in research
# =====================================================

stories = [
    # === SCROLL.IN ===
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-01-12", "headline": "CBI arrests Pune teacher in NEET-UG 2026 paper leak case", "topic": "Education", "trigger": "Investigation", "frame": "Wrongdoing Exposed", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-02-17", "headline": "India falls to 157th rank in 2026 World Press Freedom Index", "topic": "Media/Press Freedom", "trigger": "Report/Data Release", "frame": "Trend", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-03-11", "headline": "Top 1% holds 40% wealth: India among most unequal, says World Inequality Report", "topic": "Economy/Business", "trigger": "Report/Data Release", "frame": "Reality Check", "message": "Little Guy vs System", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-04-16", "headline": "India per capita GDP estimated below Bangladesh: IMF", "topic": "Economy/Business", "trigger": "Report/Data Release", "frame": "Reality Check", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-05-09", "headline": "Parody animation of PM Modi by The Wire blocked on social media", "topic": "Media/Press Freedom", "trigger": "Spontaneous Event", "frame": "Wrongdoing Exposed", "message": "Protectiveness", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-01-24", "headline": "RSS affiliates say Union Budget failed farmers and labourers", "topic": "Economy/Business", "trigger": "Reaction", "frame": "Reaction", "message": "Little Guy vs System", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-03-29", "headline": "Delhi court discharges Kejriwal, Sisodia in liquor scam case", "topic": "Judiciary/Legal", "trigger": "Judicial Action", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-01-12", "headline": "Trump backs bill for 500% tariff on India over Russian oil", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-02-17", "headline": "Special court grants bail to student activist after 18 months in UAPA case", "topic": "Judiciary/Legal", "trigger": "Judicial Action", "frame": "Wrongdoing Exposed", "message": "Little Guy vs System", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-04-16", "headline": "Election Commission orders voter re-registration in Bengal, opposition cries foul", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-05-09", "headline": "Kerala UDF wins historic mandate; Satheesan to be CM", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-03-11", "headline": "Modi and Carney announce India-Canada economic partnership deal", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Wire/Agency", "placement": "Mid"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-01-24", "headline": "India-EU free trade agreement finalised after decade of negotiations", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Historical Outlook", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-05-09", "headline": "Post-poll violence erupts in Bengal as BJP supporters targeted", "topic": "Crime/Law & Order", "trigger": "Spontaneous Event", "frame": "Conflict", "message": "Fatalism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Scroll.in", "type": "digital_native", "date": "2026-03-29", "headline": "NITI Aayog report flags 1.04 lakh single-teacher schools across India", "topic": "Education", "trigger": "Report/Data Release", "frame": "Institutional Critique", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Mid"},

    # === THE WIRE ===
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-01-12", "headline": "In 2026, India's biggest policy challenge will be dealing with the US", "topic": "Foreign Affairs/Diplomacy", "trigger": "Analysis/Interpretation", "frame": "Conjecture", "message": "Sit Up/Historic", "source_type": "Opinion/Column", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-02-17", "headline": "India responds to Trump's 500% Russia tariff bill with measured diplomacy", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "Realism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-03-11", "headline": "SIR voter re-registration: How EC's exercise could disenfranchise minorities", "topic": "Politics/Elections", "trigger": "Newsroom Enterprise", "frame": "Wrongdoing Exposed", "message": "Little Guy vs System", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-04-16", "headline": "Waqf amendment: How it became the wedge issue in five state elections", "topic": "Religion/Communalism", "trigger": "Analysis/Interpretation", "frame": "Trend", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-05-09", "headline": "BJP crosses 200 in West Bengal: What explains the saffron surge", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-01-24", "headline": "Budget 2026: Middle class gets tax relief but social sector spending stagnates", "topic": "Economy/Business", "trigger": "Legislative Action", "frame": "Policy Explored", "message": "Little Guy vs System", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-03-29", "headline": "Inside the NEET paper leak network: A multi-state syndicate", "topic": "Education", "trigger": "Investigation", "frame": "Wrongdoing Exposed", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-01-12", "headline": "Ajit Pawar killed in Baramati airport crash: Political fallout", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-02-17", "headline": "How India's trade deal with Trump sacrifices energy independence for tariff relief", "topic": "Economy/Business", "trigger": "Analysis/Interpretation", "frame": "Policy Explored", "message": "Distrustfulness", "source_type": "Opinion/Column", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-04-16", "headline": "Pahalgam anniversary: One year on, Kashmir's tourism economy still scarred", "topic": "Economy/Business", "trigger": "Anniversary/Commemoration", "frame": "Trend", "message": "Fatalism", "source_type": "Ground Report", "placement": "Mid"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-05-09", "headline": "BRICS foreign ministers fail to agree on Iran war statement in Delhi", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "Realism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-03-11", "headline": "India AI Summit 2026: Modi champions open data, critics see surveillance risk", "topic": "Science/Technology", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-01-24", "headline": "Press freedom and judicial harassment: The Wire's legal battles in 2026", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Wrongdoing Exposed", "message": "Little Guy vs System", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-04-16", "headline": "Why actor Vijay's TVK could upend Tamil Nadu's two-party system", "topic": "Politics/Elections", "trigger": "Preview/Forward Look", "frame": "Conjecture", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "The Wire", "type": "digital_native", "date": "2026-05-09", "headline": "Mamata refuses to resign despite BJP majority: Constitutional crisis looms", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},

    # === THE PRINT ===
    {"outlet": "The Print", "type": "digital_native", "date": "2026-01-12", "headline": "After Bengal, Telangana is BJP's next target: How it's laying ground", "topic": "Politics/Elections", "trigger": "Newsroom Enterprise", "frame": "Conjecture", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-02-17", "headline": "Operation Sindoor 2 could unfold in 5 years. Pakistan is learning from Iran", "topic": "Defence/National Security", "trigger": "Analysis/Interpretation", "frame": "Conjecture", "message": "Sit Up/Historic", "source_type": "Opinion/Column", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-03-11", "headline": "TVK chief Vijay's meeting with Governor proves futile: Impasse continues", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-04-16", "headline": "Bengal is prone to political violence. It didn't start with TMC-BJP", "topic": "Politics/Elections", "trigger": "Analysis/Interpretation", "frame": "Historical Outlook", "message": "Realism", "source_type": "Opinion/Column", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-05-09", "headline": "India's school system failing: NITI Aayog flags dropouts, weak learning", "topic": "Education", "trigger": "Report/Data Release", "frame": "Institutional Critique", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-01-24", "headline": "SC laments successive govts failed to ensure Election Commission independence", "topic": "Judiciary/Legal", "trigger": "Judicial Action", "frame": "Wrongdoing Exposed", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-03-29", "headline": "Al-Qaeda's new empire rising in Mali: Europe, US, Russia failed to halt it", "topic": "Defence/National Security", "trigger": "Newsroom Enterprise", "frame": "Trend", "message": "Sit Up/Historic", "source_type": "Opinion/Column", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-01-12", "headline": "Budget 2026 highlights: Boost for IB, CAPF; RSS says Budget failed farmers", "topic": "Economy/Business", "trigger": "Legislative Action", "frame": "Reaction", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-02-17", "headline": "India-Pakistan have new normal: No sanctuary safe from us, says military", "topic": "Defence/National Security", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-04-16", "headline": "Opposition doesn't know how to beat BJP: What it can learn from Hungary", "topic": "Politics/Elections", "trigger": "Analysis/Interpretation", "frame": "Conjecture", "message": "Realism", "source_type": "Opinion/Column", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-05-09", "headline": "Noel Tata's resistance to IPO creates discord at Indian conglomerate", "topic": "Economy/Business", "trigger": "Newsroom Enterprise", "frame": "Conflict", "message": "No Message", "source_type": "Bloomberg/Reuters Syndicated", "placement": "Mid"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-03-11", "headline": "Satheesan has big plans for Kerala—like Singapore or Seattle", "topic": "Politics/Elections", "trigger": "Newsroom Enterprise", "frame": "Personality Profile", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-01-24", "headline": "Skyroot Aerospace becomes first Indian space-tech unicorn", "topic": "Science/Technology", "trigger": "Non-Govt Newsmaker", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-03-29", "headline": "Did SIR help BJP? What data reveals about fiercely-contested Bengal election", "topic": "Politics/Elections", "trigger": "Newsroom Enterprise", "frame": "Reality Check", "message": "Anti-Establishment", "source_type": "Data Journalism", "placement": "Lead"},
    {"outlet": "The Print", "type": "digital_native", "date": "2026-05-09", "headline": "How Iran War is draining Wall Street tech funding", "topic": "Economy/Business", "trigger": "Analysis/Interpretation", "frame": "Trend", "message": "Realism", "source_type": "Opinion/Column", "placement": "Mid"},

    # === NEWSLAUNDRY ===
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-01-12", "headline": "TV news and BJP's election win: 'Modi magic', 'Modi wave', 'Modi ka Kamaal'", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Reality Check", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-02-17", "headline": "How godi media covered the Trump-Modi tariff deal", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Reality Check", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-03-11", "headline": "The Waqf coverage problem: Communalism sells, nuance doesn't", "topic": "Media/Press Freedom", "trigger": "Analysis/Interpretation", "frame": "Trend", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-04-16", "headline": "Newsrooms and elections: Who covered SIR voter purge and who didn't", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Wrongdoing Exposed", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-05-09", "headline": "Bengal post-poll violence: A tale of two coverages", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Reality Check", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-01-24", "headline": "Budget coverage report card: Who did the homework, who just read the press note", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Reality Check", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-03-29", "headline": "NEET scandal: How newspaper front pages buried the story", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Wrongdoing Exposed", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-02-17", "headline": "Press freedom index at 157: What Indian editors said (and didn't)", "topic": "Media/Press Freedom", "trigger": "Report/Data Release", "frame": "Institutional Critique", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-04-16", "headline": "How India's biggest news channels covered the Iran war", "topic": "Media/Press Freedom", "trigger": "Newsroom Enterprise", "frame": "Reality Check", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Newslaundry", "type": "digital_native", "date": "2026-05-09", "headline": "SEBI warns market players about AI risks: What it means for financial journalism", "topic": "Media/Press Freedom", "trigger": "Govt Statement/Action", "frame": "Process", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Mid"},

    # === FIRSTPOST ===
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-01-12", "headline": "Ajit Pawar killed in Baramati airport crash: Five dead", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Wire/Agency", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-02-17", "headline": "Trump slashes tariffs on India: What the deal means for you", "topic": "Economy/Business", "trigger": "Govt Statement/Action", "frame": "Process", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-03-11", "headline": "India wins T20 World Cup: Beating New Zealand in final", "topic": "Sports", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-04-16", "headline": "BRICS in Delhi: India caught between Iran and US-Israel axis", "topic": "Foreign Affairs/Diplomacy", "trigger": "Preview/Forward Look", "frame": "Conflict", "message": "Realism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-05-09", "headline": "TVK storms Tamil Nadu: Actor Vijay becomes youngest CM-designate", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Personality Profile", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-01-24", "headline": "India-EU free trade deal: A decade in the making", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Historical Outlook", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-03-29", "headline": "Bengal election: Why BJP's Hindutva-plus-welfare formula is working", "topic": "Politics/Elections", "trigger": "Analysis/Interpretation", "frame": "Horse Race", "message": "No Message", "source_type": "Opinion/Column", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-02-17", "headline": "Suvendu aide murdered in Bengal: BJP blames TMC, demands President's rule", "topic": "Crime/Law & Order", "trigger": "Spontaneous Event", "frame": "Conflict", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-04-16", "headline": "Strait of Hormuz blockade: How India's energy supply is threatened", "topic": "Economy/Business", "trigger": "Analysis/Interpretation", "frame": "Process", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "FirstPost", "type": "digital_native", "date": "2026-05-09", "headline": "Operation Sindoor anniversary: India marks one year since strikes on Pakistan", "topic": "Defence/National Security", "trigger": "Anniversary/Commemoration", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},

    # === NDTV ===
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-01-12", "headline": "Baramati crash: Deputy CM Ajit Pawar among five killed", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-02-17", "headline": "Trump reduces India tariffs to 18% as Modi agrees to stop Russian oil buys", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-03-11", "headline": "PM Modi visits Netherlands, inspects water management infrastructure", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-04-16", "headline": "V.D. Satheesan sworn in as Kerala Chief Minister", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-05-09", "headline": "BJP wins West Bengal in historic upset; TMC concedes", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-01-24", "headline": "Budget 2026 Live: FM Sitharaman announces Rs 95,692 crore for rural employment", "topic": "Economy/Business", "trigger": "Legislative Action", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-03-29", "headline": "NEET-UG 2026 re-exam scheduled for June 21 after paper leak", "topic": "Education", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-01-12", "headline": "EU-India free trade agreement signed: Key points", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Process", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-02-17", "headline": "NIA files chargesheet in Pahalgam terror attack case", "topic": "Defence/National Security", "trigger": "Judicial Action", "frame": "Straight News", "message": "No Message", "source_type": "Wire/Agency", "placement": "Mid"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-04-16", "headline": "India-linked supertanker attempts Hormuz exit amid Iran tensions", "topic": "Economy/Business", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Wire/Agency", "placement": "Mid"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-05-09", "headline": "2 jets collide at US air show: Dramatic video goes viral", "topic": "Culture/Entertainment", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Wire/Agency", "placement": "Mid"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-03-11", "headline": "India election 2026: Full schedule for 4 states and 1 UT announced", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-01-24", "headline": "Crude bomb injures 7 in Bengal's Panihati after election violence", "topic": "Crime/Law & Order", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-04-16", "headline": "Manipur gets new CM as President's rule ends after months", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "NDTV", "type": "legacy_digital", "date": "2026-05-09", "headline": "Indian firms pledge $20.5 billion US investment, largest-ever", "topic": "Economy/Business", "trigger": "Non-Govt Newsmaker", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},

    # === INDIA TODAY ===
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-01-12", "headline": "Ajit Pawar dead: Learjet crash at Baramati kills deputy CM", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-02-17", "headline": "India-US tariff deal: Modi agrees no more Russian oil for lower duties", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-03-11", "headline": "India beat New Zealand to win T20 World Cup 2026", "topic": "Sports", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-04-16", "headline": "Election results 2026: BJP sweeps Bengal, TVK shocks Tamil Nadu", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-05-09", "headline": "BRICS Delhi summit: Iran war casts shadow over foreign ministers' meet", "topic": "Foreign Affairs/Diplomacy", "trigger": "Preview/Forward Look", "frame": "Conflict", "message": "Realism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-01-24", "headline": "Kerala election: UDF wins 80 seats, Satheesan emerges as CM face", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-03-29", "headline": "Modi appeals to citizens to conserve foreign exchange to protect rupee", "topic": "Economy/Business", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-01-12", "headline": "Mumbai family mystery: Rat poison found in viscera, watermelon", "topic": "Crime/Law & Order", "trigger": "Investigation", "frame": "Wrongdoing Exposed", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-02-17", "headline": "Delhi-Dehradun economic corridor inaugurated by PM Modi", "topic": "Governance/Bureaucracy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-04-16", "headline": "TN Governor wants TVK to prove majority: What happens next", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Conjecture", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-05-09", "headline": "Operation Sindoor at one: How India's military doctrine changed", "topic": "Defence/National Security", "trigger": "Anniversary/Commemoration", "frame": "Historical Outlook", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-03-11", "headline": "Assam election results: BJP wins third consecutive term", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-01-24", "headline": "India ramps up Venezuela oil buys to diversify from Gulf supply", "topic": "Economy/Business", "trigger": "Newsroom Enterprise", "frame": "Process", "message": "Realism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-04-16", "headline": "98,375 kids went missing in India in 2024: NCRB data", "topic": "Crime/Law & Order", "trigger": "Report/Data Release", "frame": "Trend", "message": "Protectiveness", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "India Today", "type": "legacy_digital", "date": "2026-05-09", "headline": "ED raids associates of Punjab AAP chief in land deal probe", "topic": "Crime/Law & Order", "trigger": "Investigation", "frame": "Wrongdoing Exposed", "message": "No Message", "source_type": "Staff Reporter", "placement": "Mid"},

    # === HINDUSTAN TIMES ===
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-01-12", "headline": "Baramati crash: Maharashtra mourns as deputy CM Ajit Pawar dies", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Reaction", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-02-17", "headline": "India-US tariff truce: Duties slashed to 18% in Russia oil deal", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-03-11", "headline": "India-Canada reset: Modi-Carney announce economic partnership", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Consensus", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-04-16", "headline": "Bengal results shock TMC: BJP's 200+ seats end Mamata era", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-05-09", "headline": "BRICS Delhi: Jaishankar calls for safe maritime flows through Hormuz", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Realism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-01-24", "headline": "Budget 2026: New tax slabs, Rs 12L exemption stays, defence boost", "topic": "Economy/Business", "trigger": "Legislative Action", "frame": "Process", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-03-29", "headline": "NITI Aayog: $30 trillion economy target by 2047 in DPI plan", "topic": "Economy/Business", "trigger": "Report/Data Release", "frame": "Conjecture", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-01-12", "headline": "World's widest underground tunnel opens on Mumbai-Pune route", "topic": "Governance/Bureaucracy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-02-17", "headline": "Pahalgam anniversary: Army says 93-day hunt killed all attackers", "topic": "Defence/National Security", "trigger": "Anniversary/Commemoration", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-04-16", "headline": "Bengal post-poll violence: Crude bombs, arson as TMC vents fury", "topic": "Crime/Law & Order", "trigger": "Spontaneous Event", "frame": "Conflict", "message": "Fatalism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-05-09", "headline": "Vijay sworn in as Tamil Nadu CM after Governor relents", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-03-11", "headline": "Nitish Kumar resigns as Bihar CM, to run for Rajya Sabha", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Personality Profile", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-01-24", "headline": "Maharashtra puts Hindi proficiency test for employees on hold", "topic": "Governance/Bureaucracy", "trigger": "Govt Statement/Action", "frame": "Reaction", "message": "No Message", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-04-16", "headline": "India drug approval system set for digital overhaul: Ministry", "topic": "Health/Medicine", "trigger": "Govt Statement/Action", "frame": "Process", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Hindustan Times", "type": "legacy_digital", "date": "2026-05-09", "headline": "Hyderabad pharma firm builds satellite to spy on foreign assets in space", "topic": "Science/Technology", "trigger": "Newsroom Enterprise", "frame": "Personality Profile", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},

    # === INDIAN EXPRESS ===
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-01-12", "headline": "Baramati crash kills Ajit Pawar, reshuffles Maharashtra politics", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Conjecture", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-02-17", "headline": "How Trump tariff deal tests Modi's Russia-US balancing act", "topic": "Foreign Affairs/Diplomacy", "trigger": "Analysis/Interpretation", "frame": "Policy Explored", "message": "Realism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-03-11", "headline": "Bengal turns saffron: Inside BJP's strategy to dislodge Mamata", "topic": "Politics/Elections", "trigger": "Newsroom Enterprise", "frame": "Horse Race", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-04-16", "headline": "Five elections, five verdicts: What India's voters said in 2026", "topic": "Politics/Elections", "trigger": "Analysis/Interpretation", "frame": "Trend", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-05-09", "headline": "Mamata won't resign: What constitutional options exist", "topic": "Politics/Elections", "trigger": "Analysis/Interpretation", "frame": "Process", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-01-24", "headline": "Budget decoded: Where the money goes and what it means for you", "topic": "Economy/Business", "trigger": "Legislative Action", "frame": "Policy Explored", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-03-29", "headline": "Explained: Why the NEET paper leak keeps happening year after year", "topic": "Education", "trigger": "Newsroom Enterprise", "frame": "Institutional Critique", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-01-12", "headline": "India-EU trade deal: A guide to what was agreed and what wasn't", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Process", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-02-17", "headline": "Kiwi farming boom in Himachal Pradesh: Climate change opens new crop", "topic": "Environment", "trigger": "Newsroom Enterprise", "frame": "Trend", "message": "Optimism", "source_type": "Ground Report", "placement": "Mid"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-04-16", "headline": "Operation Sindoor: The military lessons India has learned", "topic": "Defence/National Security", "trigger": "Anniversary/Commemoration", "frame": "Historical Outlook", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-05-09", "headline": "SC asks: Why successive govts failed to protect EC independence", "topic": "Judiciary/Legal", "trigger": "Judicial Action", "frame": "Wrongdoing Exposed", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-03-11", "headline": "India's disabled grappling with UDID system: Ground report from Bihar", "topic": "Social Issues/Welfare", "trigger": "Newsroom Enterprise", "frame": "Institutional Critique", "message": "Little Guy vs System", "source_type": "Ground Report", "placement": "Mid"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-01-24", "headline": "From reluctant entrant to Bihar minister: JD(U)'s Nishant Kumar", "topic": "Politics/Elections", "trigger": "Newsroom Enterprise", "frame": "Personality Profile", "message": "No Message", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-04-16", "headline": "Bengal election: How SIR voter rolls reshaped the electorate", "topic": "Politics/Elections", "trigger": "Newsroom Enterprise", "frame": "Reality Check", "message": "Anti-Establishment", "source_type": "Data Journalism", "placement": "Lead"},
    {"outlet": "Indian Express", "type": "legacy_digital", "date": "2026-05-09", "headline": "India silver hallmarking: New report flags economic bottlenecks", "topic": "Economy/Business", "trigger": "Report/Data Release", "frame": "Policy Explored", "message": "Realism", "source_type": "Staff Reporter", "placement": "Mid"},

    # === TIMES OF INDIA ===
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-01-12", "headline": "Ajit Pawar dies in Baramati airport crash; PM Modi pays tribute", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-02-17", "headline": "India-US trade deal: Tariffs cut to 18%, Modi pledges no Russian oil", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Wire/Agency", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-03-11", "headline": "India T20 World Cup champions: Nation celebrates", "topic": "Sports", "trigger": "Spontaneous Event", "frame": "Reaction", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-04-16", "headline": "Election 2026: BJP stuns Bengal, Vijay takes TN, UDF wins Kerala", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-05-09", "headline": "BRICS meet in Delhi: India pushes for Hormuz safe passage", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-01-24", "headline": "Budget 2026: Middle class gets relief, defence gets big push", "topic": "Economy/Business", "trigger": "Legislative Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-03-29", "headline": "NEET 2026 exam cancelled, re-test on June 21: What students should know", "topic": "Education", "trigger": "Govt Statement/Action", "frame": "Process", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-01-12", "headline": "EU Chief vows India-EU trade pact by year end", "topic": "Foreign Affairs/Diplomacy", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Wire/Agency", "placement": "Mid"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-02-17", "headline": "Goa's Sadhvi Sail crowned Femina Miss India World 2026", "topic": "Culture/Entertainment", "trigger": "Spontaneous Event", "frame": "Personality Profile", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-04-16", "headline": "Waqf protests turn violent in Bengal: Vehicles, property damaged", "topic": "Religion/Communalism", "trigger": "Spontaneous Event", "frame": "Conflict", "message": "Fatalism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-05-09", "headline": "Operation Sindoor anniversary: India showcases military strength", "topic": "Defence/National Security", "trigger": "Anniversary/Commemoration", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-03-11", "headline": "Young Indians turning to acrobatic rock and roll over cricket", "topic": "Culture/Entertainment", "trigger": "Newsroom Enterprise", "frame": "Trend", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-01-24", "headline": "International Athletics Meet 2026 strengthens India's sports infra", "topic": "Sports", "trigger": "Preview/Forward Look", "frame": "Conjecture", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-04-16", "headline": "Kerala budget row: Leaders disappointed by limited allocations", "topic": "Economy/Business", "trigger": "Reaction", "frame": "Reaction", "message": "Distrustfulness", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "Times of India", "type": "legacy_digital", "date": "2026-05-09", "headline": "IAS officer revives Haryana archaeology: Narnaul the crown jewel", "topic": "Culture/Entertainment", "trigger": "Newsroom Enterprise", "frame": "Personality Profile", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},

    # === NEWS18 ===
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-01-12", "headline": "Breaking: Ajit Pawar killed in jet crash at Baramati airport", "topic": "Politics/Elections", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Wire/Agency", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-02-17", "headline": "Trump cuts India tariffs to 18%: Here's what changes", "topic": "Economy/Business", "trigger": "Govt Statement/Action", "frame": "Process", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-03-11", "headline": "Bengal: BJP's saffron wave or Mamata's failures? Top takeaways", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Horse Race", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-04-16", "headline": "TVK's Vijay: From silver screen to CM's chair in Tamil Nadu", "topic": "Politics/Elections", "trigger": "Election/Poll Result", "frame": "Personality Profile", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-05-09", "headline": "BRICS foreign ministers meet in Delhi amid Iran war tensions", "topic": "Foreign Affairs/Diplomacy", "trigger": "Preview/Forward Look", "frame": "Conflict", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-01-24", "headline": "Budget 2026 at a glance: Winners and losers", "topic": "Economy/Business", "trigger": "Legislative Action", "frame": "Horse Race", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-03-29", "headline": "NEET leak: CBI arrests another teacher, network widens", "topic": "Education", "trigger": "Investigation", "frame": "Wrongdoing Exposed", "message": "Anti-Establishment", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-01-12", "headline": "Kerala CM Vijayan announces 20-minister cabinet, 14 new faces", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-02-17", "headline": "Suvendu Adhikari's aide Chandranath Rath murdered in Bengal", "topic": "Crime/Law & Order", "trigger": "Spontaneous Event", "frame": "Straight News", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-04-16", "headline": "Iran war: India's oil supply under threat as Hormuz stays blocked", "topic": "Economy/Business", "trigger": "Analysis/Interpretation", "frame": "Conjecture", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-05-09", "headline": "Operation Sindoor: One year on, Pakistan's 'new normal'", "topic": "Defence/National Security", "trigger": "Anniversary/Commemoration", "frame": "Historical Outlook", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-03-11", "headline": "India AI Summit: PM Modi pushes for open data governance", "topic": "Science/Technology", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-01-24", "headline": "Modi address: Save the rupee by conserving forex, PM tells citizens", "topic": "Economy/Business", "trigger": "Govt Statement/Action", "frame": "Straight News", "message": "Sit Up/Historic", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-04-16", "headline": "Bengal violence: BJP demands President's rule as TMC retaliates", "topic": "Politics/Elections", "trigger": "Govt Statement/Action", "frame": "Conflict", "message": "No Message", "source_type": "Staff Reporter", "placement": "Lead"},
    {"outlet": "News18", "type": "legacy_digital", "date": "2026-05-09", "headline": "Miss India World 2026: Goa's Sadhvi Sail wins crown", "topic": "Culture/Entertainment", "trigger": "Spontaneous Event", "frame": "Personality Profile", "message": "Optimism", "source_type": "Staff Reporter", "placement": "Mid"},
]

print(f"Total stories coded: {len(stories)}")

# Save as JSON
with open('/sessions/modest-peaceful-hamilton/mnt/outputs/dataset.json', 'w') as f:
    json.dump(stories, f, indent=2)

print("Dataset saved to dataset.json")
print(f"\nOutlet distribution:")
from collections import Counter
outlet_counts = Counter(s['outlet'] for s in stories)
for outlet, count in sorted(outlet_counts.items(), key=lambda x: -x[1]):
    print(f"  {outlet}: {count}")

print(f"\nFrame distribution:")
frame_counts = Counter(s['frame'] for s in stories)
for frame, count in sorted(frame_counts.items(), key=lambda x: -x[1]):
    pct = round(count/len(stories)*100, 1)
    print(f"  {frame}: {count} ({pct}%)")

print(f"\nTopic distribution:")
topic_counts = Counter(s['topic'] for s in stories)
for topic, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
    pct = round(count/len(stories)*100, 1)
    print(f"  {topic}: {count} ({pct}%)")

print(f"\nTrigger distribution:")
trigger_counts = Counter(s['trigger'] for s in stories)
for trigger, count in sorted(trigger_counts.items(), key=lambda x: -x[1]):
    pct = round(count/len(stories)*100, 1)
    print(f"  {trigger}: {count} ({pct}%)")

print(f"\nMessage distribution:")
message_counts = Counter(s['message'] for s in stories)
for msg, count in sorted(message_counts.items(), key=lambda x: -x[1]):
    pct = round(count/len(stories)*100, 1)
    print(f"  {msg}: {count} ({pct}%)")

# Digital native vs legacy
dn = [s for s in stories if s['type'] == 'digital_native']
ld = [s for s in stories if s['type'] == 'legacy_digital']
print(f"\n--- DIGITAL NATIVE ({len(dn)} stories) vs LEGACY DIGITAL ({len(ld)} stories) ---")

print("\nFrame comparison:")
dn_frames = Counter(s['frame'] for s in dn)
ld_frames = Counter(s['frame'] for s in ld)
all_frames_set = set(list(dn_frames.keys()) + list(ld_frames.keys()))
for frame in sorted(all_frames_set):
    dn_pct = round(dn_frames.get(frame, 0)/len(dn)*100, 1)
    ld_pct = round(ld_frames.get(frame, 0)/len(ld)*100, 1)
    print(f"  {frame}: DN={dn_pct}% vs LD={ld_pct}%")

