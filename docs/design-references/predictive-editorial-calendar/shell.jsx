// shell.jsx — page chrome: sidebar, header, top tabs, filter strip
// Voice: IOJ-led (warm bg, thick black borders, Playfair display, IOJ green system accent)

const SHELL_C = {
  bg:        '#f0ece4',         // warm off-white
  surface:   '#ffffff',
  ink:       '#111111',
  ink2:      '#444444',
  ink3:      '#888888',
  rule:      '#d4cfc6',         // warm rule line
  ruleSoft:  '#e6e0d4',
  border:    '#111111',          // thick black frame
  iojGreen:  '#2D7A4F',
  iojGreenDark: '#1f5c38',
  iojGreenLight: '#e6f5ec',
  amber:     '#b35d00',
};

const TABS = [
  { id: 'calendar',  label: 'Forward Calendar', sub: 'Gantt' },
  { id: 'list',      label: 'Event Feed',       sub: 'List' },
  { id: 'pastdue',   label: 'Past-due',         sub: 'Accountability' },
  { id: 'pipeline',  label: 'Pipeline',         sub: 'Sources & status' },
];

function HeaderMast({ activeTab, setActiveTab, todayLabel }) {
  return (
    <header style={{
      background: SHELL_C.surface,
      borderBottom: `2px solid ${SHELL_C.border}`,
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      {/* Masthead row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px 8px',
        borderBottom: `1px solid ${SHELL_C.ruleSoft}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="ds/logo.png"
            alt="OnlineJournalism.in"
            style={{
              height: 56, width: 'auto', display: 'block', flexShrink: 0,
              imageRendering: '-webkit-optimize-contrast',
            }}
          />
          <div style={{
            width: 1, height: 46, background: SHELL_C.rule,
          }} />
          <div>
            <div style={{
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '.16em', textTransform: 'uppercase', color: SHELL_C.ink3,
              marginBottom: 2,
            }}>
              OnlineJournalism.in &nbsp;·&nbsp; Tools
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800,
              color: SHELL_C.ink, letterSpacing: '-.5px', lineHeight: 1.05,
            }}>
              Predictive Editorial Calendar
            </div>
          </div>
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: SHELL_C.ink3,
            paddingBottom: 5, letterSpacing: '.04em', alignSelf: 'flex-end',
          }}>
            Demo build · v0.4
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase', color: SHELL_C.ink3,
            }}>Today</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: SHELL_C.ink }}>
              {todayLabel}
            </div>
          </div>
          <button style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 700,
            background: SHELL_C.ink, color: '#fff', border: 'none',
            padding: '8px 16px', cursor: 'pointer', letterSpacing: '.04em',
          }}>
            Run pipeline now →
          </button>
        </div>
      </div>
      {/* Tab strip */}
      <nav style={{ display: 'flex', padding: '0 28px', gap: 0, alignItems: 'stretch' }}>
        {TABS.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              fontFamily: "'Source Sans 3', sans-serif",
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px 10px 0',
              marginRight: 18,
              borderBottom: active ? `3px solid ${SHELL_C.ink}` : '3px solid transparent',
              marginBottom: -2,
              textAlign: 'left',
              color: active ? SHELL_C.ink : SHELL_C.ink2,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>{tab.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: active ? SHELL_C.iojGreen : SHELL_C.ink3, marginTop: 1 }}>
                {tab.sub}
              </div>
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{
          alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 12,
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: SHELL_C.ink3,
        }}>
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: SHELL_C.iojGreen,
          }} />
          Pipeline ran 06:20 IST · 2,871 raw items · 73 candidates · 16 extracted
        </div>
      </nav>
    </header>
  );
}

function FilterStrip({ filters, setFilters, eventsTotal, eventsShown }) {
  const { beat, minConfidence, horizon, search } = filters;
  const beatOpts = [{ id: 'all', label: 'All beats' }, ...BEATS];

  const chipStyle = (active) => ({
    fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 600,
    padding: '5px 11px',
    border: `1px solid ${active ? SHELL_C.ink : SHELL_C.rule}`,
    background: active ? SHELL_C.ink : SHELL_C.surface,
    color: active ? '#fff' : SHELL_C.ink2,
    cursor: 'pointer', letterSpacing: '.01em',
    borderRadius: 0,
  });

  return (
    <div style={{
      background: SHELL_C.surface,
      borderBottom: `1px solid ${SHELL_C.rule}`,
      padding: '12px 28px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      {/* Beat chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: '.12em', textTransform: 'uppercase', color: SHELL_C.ink3,
          marginRight: 4,
        }}>Beat</span>
        {beatOpts.map(b => (
          <button key={b.id} style={chipStyle(beat === b.id)} onClick={() => setFilters({ ...filters, beat: b.id })}>
            {b.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 22, background: SHELL_C.rule }} />

      {/* Horizon */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: '.12em', textTransform: 'uppercase', color: SHELL_C.ink3,
        }}>Horizon</span>
        {[30, 60, 90, 180].map(d => (
          <button key={d} style={chipStyle(horizon === d)} onClick={() => setFilters({ ...filters, horizon: d })}>
            {d}d
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 22, background: SHELL_C.rule }} />

      {/* Confidence slider */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
          letterSpacing: '.12em', textTransform: 'uppercase', color: SHELL_C.ink3,
        }}>Min confidence</span>
        <input
          type="range" min="0" max="100" step="5"
          value={minConfidence * 100}
          onChange={e => setFilters({ ...filters, minConfidence: e.target.value / 100 })}
          style={{ width: 100, accentColor: SHELL_C.iojGreen }}
        />
        <span style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 700,
          color: SHELL_C.ink, minWidth: 36, textAlign: 'right',
        }}>{Math.round(minConfidence * 100)}%</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Counts + search */}
      <div style={{
        fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: SHELL_C.ink2,
      }}>
        <span style={{ fontWeight: 700, color: SHELL_C.ink }}>{eventsShown}</span>
        <span style={{ color: SHELL_C.ink3 }}> of {eventsTotal} surfaced</span>
      </div>
      <input
        placeholder="Search promise text, person, ministry…"
        value={search} onChange={e => setFilters({ ...filters, search: e.target.value })}
        style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 12,
          padding: '6px 10px', width: 220,
          border: `1px solid ${SHELL_C.rule}`, background: SHELL_C.bg,
          outline: 'none', color: SHELL_C.ink,
        }}
      />
    </div>
  );
}

Object.assign(window, { SHELL_C, TABS, HeaderMast, FilterStrip });
