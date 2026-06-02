// data.jsx — sample dataset for the Predictive Editorial Calendar demo
// "Today" is pinned to 17 May 2026 so the demo is reproducible.

const TODAY = new Date('2026-05-17T09:00:00+05:30');

// Lead-time markers in days before deadline.
const LEAD_TIMES = [90, 60, 30, 14, 7, 1];

const BEATS = [
  { id: 'politics',    label: 'Politics',   color: '#2B3D8F' },
  { id: 'courts',      label: 'Courts',     color: '#7a4f00' },
  { id: 'economy',     label: 'Economy',    color: '#2D7A4F' },
  { id: 'infra',       label: 'Infra & Transport', color: '#b35d00' },
  { id: 'health',      label: 'Health',     color: '#b01e1e' },
  { id: 'sci-tech',    label: 'Science & Tech',    color: '#3a3a8a' },
  { id: 'education',   label: 'Education',  color: '#5a4b9a' },
  { id: 'sport',       label: 'Sport',      color: '#2a6e2a' },
];

const SOURCES = [
  { id: 'pib',     label: 'PIB press releases', kind: 'Official',  active: true,  lastFetch: '17 May 2026, 06:14 IST', items: 412 },
  { id: 'gdelt',   label: 'GDELT v2',           kind: 'Aggregator', active: true,  lastFetch: '17 May 2026, 06:18 IST', items: 1840 },
  { id: 'indianexpress-rss', label: 'Indian Express — RSS', kind: 'RSS', active: true, lastFetch: '17 May 2026, 06:20 IST', items: 286 },
  { id: 'livemint-rss',      label: 'Mint — RSS',           kind: 'RSS', active: true, lastFetch: '17 May 2026, 06:20 IST', items: 198 },
  { id: 'thewire-rss',       label: 'The Wire — RSS',       kind: 'RSS', active: true, lastFetch: '17 May 2026, 06:20 IST', items: 64 },
  { id: 'scroll-rss',        label: 'Scroll.in — RSS',      kind: 'RSS', active: true, lastFetch: '17 May 2026, 06:20 IST', items: 71 },
  { id: 'twitter',           label: 'X / Twitter',           kind: 'Social', active: false, lastFetch: '—', items: 0, note: 'Phase 2 — paid API' },
];

// Helper to add days
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(aISO, bISO) {
  const a = new Date(aISO + 'T00:00:00+05:30');
  const b = new Date(bISO + 'T00:00:00+05:30');
  return Math.round((b - a) / 86400000);
}

const TODAY_ISO = TODAY.toISOString().slice(0, 10); // 2026-05-17

// ─── Upcoming events (deadline in next ~90 days) ───
const EVENTS = [
  {
    id: 'evt-001',
    who: 'Nitin Gadkari, Union Minister of Road Transport',
    what: 'Delhi–Dehradun expressway to be opened to public traffic.',
    deadline: '2026-06-15',
    dateClaimed: '2026-02-08',
    sourceName: 'PIB',
    sourceUrl: 'https://pib.gov.in/PressRelease/...',
    originalText: 'The Minister said the entire 210-km Delhi–Dehradun expressway, including the Datkali tunnel, would be opened to traffic by June 2026, cutting travel time to 2.5 hours.',
    confidence: 0.92,
    beat: 'infra',
    location: 'New Delhi',
  },
  {
    id: 'evt-002',
    who: 'Ministry of Electronics & IT (MeitY)',
    what: 'Notify final DPDP Rules under the Digital Personal Data Protection Act.',
    deadline: '2026-06-30',
    dateClaimed: '2026-03-22',
    sourceName: 'Mint',
    sourceUrl: 'https://www.livemint.com/...',
    originalText: 'A senior MeitY official said the rules would be notified before end of the first quarter of FY27, after addressing concerns from start-ups on consent-manager obligations.',
    confidence: 0.81,
    beat: 'politics',
    location: 'New Delhi',
  },
  {
    id: 'evt-003',
    who: 'Ashwini Vaishnaw, Union Railway Minister',
    what: 'Trial run of Vande Bharat sleeper variant on Delhi–Mumbai route.',
    deadline: '2026-07-15',
    dateClaimed: '2026-01-30',
    sourceName: 'Indian Express',
    sourceUrl: 'https://indianexpress.com/...',
    originalText: 'Vaishnaw told reporters the first revenue-trial run of the Vande Bharat sleeper variant would happen by mid-July, with commercial services to follow within 90 days.',
    confidence: 0.74,
    beat: 'infra',
    location: 'New Delhi',
  },
  {
    id: 'evt-004',
    who: 'Reserve Bank of India',
    what: 'Monetary Policy Committee meeting — repo-rate decision.',
    deadline: '2026-08-06',
    dateClaimed: '2026-04-10',
    sourceName: 'PIB',
    sourceUrl: 'https://rbi.org.in/...',
    originalText: 'The next meeting of the Monetary Policy Committee is scheduled for August 4–6, 2026. The resolution will be announced on the third day at 10:00 AM.',
    confidence: 0.99,
    beat: 'economy',
    location: 'Mumbai',
    fixed: true,
  },
  {
    id: 'evt-005',
    who: 'Siddaramaiah, Chief Minister of Karnataka',
    what: 'Clear pending DA arrears of 5.7 lakh state-government employees.',
    deadline: '2026-06-30',
    dateClaimed: '2026-04-02',
    sourceName: 'The Wire',
    sourceUrl: 'https://thewire.in/...',
    originalText: 'Speaking in the Vidhana Soudha, the CM said all pending dearness-allowance arrears would be cleared "by the end of this June", calling it a moral obligation of the state.',
    confidence: 0.69,
    beat: 'politics',
    location: 'Bengaluru',
  },
  {
    id: 'evt-006',
    who: 'BMC (Brihanmumbai Municipal Corp.)',
    what: 'Open Phase 2 of the Mumbai Coastal Road (Versova–Bhayandar) to public.',
    deadline: '2026-07-01',
    dateClaimed: '2026-01-15',
    sourceName: 'GDELT / TOI',
    sourceUrl: 'https://timesofindia.indiatimes.com/...',
    originalText: 'The civic chief said Phase 2 of the Coastal Road project would be thrown open to the public by July 1, 2026, subject to safety audit clearance.',
    confidence: 0.58,
    beat: 'infra',
    location: 'Mumbai',
  },
  {
    id: 'evt-007',
    who: 'ISRO Chairman S. Somanath',
    what: 'Chandrayaan-4 sample-return mission launch window.',
    deadline: '2026-08-22',
    dateClaimed: '2026-03-04',
    sourceName: 'PIB',
    sourceUrl: 'https://www.isro.gov.in/...',
    originalText: 'The Chairman said the Chandrayaan-4 launch window opens in the second half of August 2026, with August 22 as the primary date.',
    confidence: 0.88,
    beat: 'sci-tech',
    location: 'Sriharikota',
  },
  {
    id: 'evt-008',
    who: 'K-RIDE',
    what: 'Bengaluru suburban rail Heelalige–Rajanukunte line operational.',
    deadline: '2026-08-15',
    dateClaimed: '2025-11-18',
    sourceName: 'Deccan Herald (GDELT)',
    sourceUrl: 'https://www.deccanherald.com/...',
    originalText: 'K-RIDE said Phase 1 of the project, the 25-km Heelalige–Rajanukunte corridor, would be operational by Independence Day 2026.',
    confidence: 0.42,
    beat: 'infra',
    location: 'Bengaluru',
  },
  {
    id: 'evt-009',
    who: 'Nirmala Sitharaman, Union Finance Minister',
    what: 'GST Council meeting on rate rationalisation.',
    deadline: '2026-06-25',
    dateClaimed: '2026-04-18',
    sourceName: 'PIB',
    sourceUrl: 'https://pib.gov.in/...',
    originalText: 'The Finance Minister said the next GST Council meeting would convene before the end of June to take up the rate-rationalisation recommendations of the Group of Ministers.',
    confidence: 0.78,
    beat: 'economy',
    location: 'New Delhi',
  },
  {
    id: 'evt-010',
    who: 'CBDT',
    what: 'Final Aadhaar–PAN linking deadline (no further extensions).',
    deadline: '2026-06-30',
    dateClaimed: '2026-03-31',
    sourceName: 'PIB',
    sourceUrl: 'https://incometaxindia.gov.in/...',
    originalText: 'The CBDT said the deadline for linking PAN with Aadhaar stands at 30 June 2026 and will not be extended further, after which inactive PANs will attract higher TDS rates.',
    confidence: 0.91,
    beat: 'economy',
    location: 'New Delhi',
  },
  {
    id: 'evt-011',
    who: 'West Bengal School Service Commission',
    what: 'Publish revised SLST recruitment list per Supreme Court order.',
    deadline: '2026-07-12',
    dateClaimed: '2026-04-12',
    sourceName: 'Scroll.in',
    sourceUrl: 'https://scroll.in/...',
    originalText: 'The WBSSC informed the Supreme Court it would publish the revised list of selected candidates within three months — by 12 July — and complete fresh document verification thereafter.',
    confidence: 0.66,
    beat: 'courts',
    location: 'Kolkata',
  },
  {
    id: 'evt-012',
    who: 'Office of the President of India',
    what: 'Term of Chief Election Commissioner ends — successor appointment due.',
    deadline: '2026-09-05',
    dateClaimed: '2025-09-05',
    sourceName: 'PIB (records)',
    sourceUrl: 'https://eci.gov.in/...',
    originalText: 'The Chief Election Commissioner\u2019s term, under the CEC Act 2023, concludes on 5 September 2026; a new appointment must be made by the President on the recommendation of the selection committee.',
    confidence: 0.97,
    beat: 'politics',
    location: 'New Delhi',
    fixed: true,
  },
  {
    id: 'evt-013',
    who: 'Mansukh Mandaviya, Union Health Minister',
    what: 'PM-JAY coverage expansion to cover senior citizens above 70 — rollout.',
    deadline: '2026-07-31',
    dateClaimed: '2026-02-21',
    sourceName: 'PIB',
    sourceUrl: 'https://pib.gov.in/...',
    originalText: 'The Minister said the expanded Ayushman Bharat coverage for all citizens above 70 years would be rolled out across all states by end-July 2026, regardless of income.',
    confidence: 0.83,
    beat: 'health',
    location: 'New Delhi',
  },
  {
    id: 'evt-014',
    who: 'Ministry of Education',
    what: 'CUET-UG 2026 final result declaration.',
    deadline: '2026-07-18',
    dateClaimed: '2026-04-20',
    sourceName: 'Indian Express',
    sourceUrl: 'https://indianexpress.com/...',
    originalText: 'The Ministry of Education said the National Testing Agency would declare the final CUET-UG 2026 result by 18 July, in time for university admissions to begin in August.',
    confidence: 0.79,
    beat: 'education',
    location: 'New Delhi',
  },
  {
    id: 'evt-015',
    who: 'Supreme Court of India — Constitution Bench',
    what: 'Judgment reserved on Places of Worship Act, 1991 — expected.',
    deadline: '2026-08-01',
    dateClaimed: '2026-04-29',
    sourceName: 'The Wire',
    sourceUrl: 'https://thewire.in/...',
    originalText: 'A five-judge Constitution Bench reserved judgment on petitions challenging the Places of Worship Act, indicating the verdict would be delivered before the court\u2019s summer vacation ends in early August.',
    confidence: 0.55,
    beat: 'courts',
    location: 'New Delhi',
  },
  {
    id: 'evt-016',
    who: 'BCCI',
    what: 'Asia Cup 2026 — India squad announcement.',
    deadline: '2026-08-20',
    dateClaimed: '2026-04-25',
    sourceName: 'Indian Express',
    sourceUrl: 'https://indianexpress.com/...',
    originalText: 'The selection committee will meet on or before August 20 to pick the squad for the Asia Cup, the BCCI said in a release.',
    confidence: 0.71,
    beat: 'sport',
    location: 'Mumbai',
  },
];

// ─── Past-due events (accountability queue) ───
const PAST_DUE = [
  {
    id: 'pd-001',
    who: 'Prime Minister Narendra Modi',
    what: 'AIIMS Rewari (Manethi, Haryana) to be operational.',
    deadline: '2026-04-10',
    dateClaimed: '2024-02-16',
    sourceName: 'PIB (2024 archive)',
    sourceUrl: 'https://pib.gov.in/...',
    originalText: 'Speaking at the foundation-laying ceremony in Manethi, the Prime Minister said AIIMS Rewari would be ready and operational within 22 months.',
    confidence: 0.85,
    beat: 'health',
    delivered: 'unverified',
  },
  {
    id: 'pd-002',
    who: 'Ministry of Road Transport & Highways',
    what: 'Bharatmala Phase-I completion (34,800 km).',
    deadline: '2026-03-31',
    dateClaimed: '2022-07-18',
    sourceName: 'PIB (2022 archive)',
    sourceUrl: 'https://pib.gov.in/...',
    originalText: 'The Ministry said the entire Bharatmala Pariyojana Phase-I would be completed by 31 March 2026, despite Covid-related delays.',
    confidence: 0.76,
    beat: 'infra',
    delivered: 'partial',
  },
  {
    id: 'pd-003',
    who: 'Department of Telecommunications',
    what: '5G rollout to 90 percent of rural India.',
    deadline: '2026-04-30',
    dateClaimed: '2023-10-01',
    sourceName: 'Mint (2023 archive)',
    sourceUrl: 'https://www.livemint.com/...',
    originalText: 'The Telecom Secretary said 5G services would cover 90 percent of rural India within 30 months — by April 2026.',
    confidence: 0.62,
    beat: 'sci-tech',
    delivered: 'unverified',
  },
  {
    id: 'pd-004',
    who: 'Karnataka Government',
    what: 'Two new IT investment regions to be notified.',
    deadline: '2026-04-15',
    dateClaimed: '2025-08-04',
    sourceName: 'Deccan Herald',
    sourceUrl: 'https://www.deccanherald.com/...',
    originalText: 'The state IT Minister said two new IT Investment Region notifications would be issued within eight months.',
    confidence: 0.51,
    beat: 'economy',
    delivered: 'unverified',
  },
  {
    id: 'pd-005',
    who: 'Tamil Nadu Chief Minister M.K. Stalin',
    what: 'New Greenfield airport at Parandur — land acquisition complete.',
    deadline: '2026-05-01',
    dateClaimed: '2024-07-08',
    sourceName: 'Indian Express',
    sourceUrl: 'https://indianexpress.com/...',
    originalText: 'The CM told the assembly that land acquisition for the Parandur greenfield airport would be completed within 22 months, paving the way for groundbreaking.',
    confidence: 0.58,
    beat: 'infra',
    delivered: 'overdue',
  },
];

// Generate lead-time marker dates per event
function leadTimeMarkers(deadline) {
  return LEAD_TIMES.map(d => ({
    days: d,
    date: addDays(deadline + 'T00:00:00', -d),
    passed: daysBetween(TODAY_ISO, addDays(deadline + 'T00:00:00', -d)) < 0,
  }));
}

function statusFor(deadline) {
  const d = daysBetween(TODAY_ISO, deadline);
  if (d < 0) return 'past-due';
  if (d <= 1) return 'due';
  if (d <= 7) return 'imminent';
  if (d <= 14) return 'soon';
  if (d <= 30) return 'this-month';
  return 'upcoming';
}

function nextLeadTime(deadline) {
  const d = daysBetween(TODAY_ISO, deadline);
  if (d < 0) return null;
  // The next *future* marker: the smallest LEAD_TIMES value >= d
  const upcoming = LEAD_TIMES.filter(x => x >= d).sort((a, b) => a - b);
  // The current "phase" is the smallest LEAD_TIMES value <= d... wait
  // We want the WINDOW we're in: e.g. d=42 means we're in the 60-day window (past 90, not yet 30)
  const past = LEAD_TIMES.filter(x => x >= d);
  return past.length ? past[past.length - 1] : LEAD_TIMES[LEAD_TIMES.length - 1];
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00+05:30');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateShort(iso) {
  const d = new Date(iso + 'T00:00:00+05:30');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

Object.assign(window, {
  TODAY, TODAY_ISO, LEAD_TIMES, BEATS, SOURCES, EVENTS, PAST_DUE,
  addDays, daysBetween, leadTimeMarkers, statusFor, nextLeadTime,
  formatDate, formatDateShort,
});
