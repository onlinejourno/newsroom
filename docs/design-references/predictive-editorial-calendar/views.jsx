// views.jsx — alternate views: ListView, PastDueView, PipelineView, MonthGridView
// All consume the same filtered events array as TimelineView.

/* ─────── Event List view (denser, more reading) ─────── */
function ListView({ events, onSelect }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid #111`,
      padding: 0,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '120px 110px 1fr 100px 110px',
        gap: 14, padding: '12px 24px',
        borderBottom: `2px solid #111`,
        fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
        letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
      }}>
        <span>Deadline</span>
        <span>Lead-time</span>
        <span>Promise</span>
        <span>Confidence</span>
        <span>Source</span>
      </div>
      {events.map(e => {
        const d = daysBetween(TODAY_ISO, e.deadline);
        const bucket = bucketFor(d);
        return (
          <button key={e.id} onClick={() => onSelect(e)} style={{
            display: 'grid', gridTemplateColumns: '120px 110px 1fr 100px 110px',
            gap: 14, padding: '14px 24px',
            borderBottom: `1px solid #e6e0d4`,
            background: 'none', border: 'none', borderBottom: `1px solid #e6e0d4`,
            textAlign: 'left', cursor: 'pointer', width: '100%',
            alignItems: 'start',
          }}>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800,
                color: '#111', lineHeight: 1.1,
              }}>{formatDateShort(e.deadline)}</div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#888',
                marginTop: 2,
              }}>{new Date(e.deadline + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long' })}</div>
            </div>
            <div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 700,
                color: bucket.color,
              }}>{daysOutLabel(d)}</div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10,
                color: bucket.color, letterSpacing: '.06em', textTransform: 'uppercase',
                fontWeight: 600, marginTop: 2,
              }}>{bucket.sub}</div>
            </div>
            <div>
              <BeatTag beat={e.beat} />
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700,
                color: '#111', marginTop: 4, lineHeight: 1.35,
              }}>{e.what}</div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#666',
                marginTop: 3,
              }}>{e.who}</div>
            </div>
            <div>
              <ConfidenceDots value={e.confidence} />
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#111',
                fontWeight: 700, marginTop: 4,
              }}>{Math.round(e.confidence * 100)}%</div>
            </div>
            <div style={{
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#666',
            }}>
              <div style={{ fontWeight: 600 }}>{e.sourceName}</div>
              <div style={{ color: '#888', marginTop: 2 }}>claimed {formatDateShort(e.dateClaimed)}</div>
            </div>
          </button>
        );
      })}
      {events.length === 0 && (
        <div style={{
          padding: '60px 0', textAlign: 'center',
          fontFamily: "'Noto Serif', serif", fontStyle: 'italic', color: '#888',
        }}>
          No events match these filters.
        </div>
      )}
    </div>
  );
}

/* ─────── Past-due / Accountability view ─────── */
function PastDueView({ onSelect }) {
  const items = [...PAST_DUE].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const summary = {
    overdue:    items.filter(i => i.delivered === 'overdue').length,
    partial:    items.filter(i => i.delivered === 'partial').length,
    unverified: items.filter(i => i.delivered === 'unverified').length,
  };
  return (
    <div>
      {/* Editor's hint banner */}
      <div style={{
        background: '#fdeaea', border: `1px solid #D32B2B`,
        padding: '14px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          background: '#D32B2B', color: '#fff',
          padding: '4px 10px', fontFamily: "'Source Sans 3', sans-serif",
          fontSize: 10, fontWeight: 800, letterSpacing: '.12em',
        }}>ACCOUNTABILITY</div>
        <div style={{
          fontFamily: "'Noto Serif', serif", fontSize: 14, color: '#1A1A1A',
          fontStyle: 'italic',
        }}>
          Promised by someone — delivered? These items have crossed their deadline. Assign a reporter to verify.
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
          <Counter n={summary.overdue} label="overdue" color="#D32B2B" />
          <Counter n={summary.partial} label="partial" color="#b35d00" />
          <Counter n={summary.unverified} label="unverified" color="#666" />
        </div>
      </div>

      <div style={{
        background: '#fff', border: `1px solid #111`,
        padding: 0,
      }}>
        {items.map(e => {
          const overdue = Math.abs(daysBetween(TODAY_ISO, e.deadline));
          const dStat = {
            'overdue':    { color: '#D32B2B', label: 'Overdue · investigate' },
            'partial':    { color: '#b35d00', label: 'Partially delivered' },
            'unverified': { color: '#666',    label: 'Status not verified' },
          }[e.delivered];
          return (
            <button key={e.id} onClick={() => onSelect(e)} style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 200px',
              gap: 16, padding: '16px 24px',
              borderBottom: `1px solid #e6e0d4`,
              background: 'none', border: 'none', borderBottom: `1px solid #e6e0d4`,
              width: '100%', textAlign: 'left', cursor: 'pointer',
            }}>
              <div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 800,
                  letterSpacing: '.12em', textTransform: 'uppercase',
                  color: '#D32B2B',
                }}>{overdue}d past-due</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800,
                  color: '#111', marginTop: 4, lineHeight: 1.1,
                }}>{formatDateShort(e.deadline)}</div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, color: '#888',
                  marginTop: 1,
                }}>was due</div>
              </div>
              <div>
                <BeatTag beat={e.beat} />
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700,
                  color: '#111', marginTop: 4, lineHeight: 1.3,
                }}>{e.what}</div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#666',
                  marginTop: 4,
                }}>{e.who}</div>
                <div style={{
                  fontFamily: "'Noto Serif', serif", fontStyle: 'italic', fontSize: 12,
                  color: '#444', marginTop: 6, lineHeight: 1.5,
                  borderLeft: `2px solid #d4cfc6`, paddingLeft: 10,
                }}>
                  “{e.originalText.slice(0, 160)}…”
                </div>
              </div>
              <div style={{ paddingLeft: 12, borderLeft: `1px solid #e6e0d4` }}>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 800,
                  letterSpacing: '.12em', textTransform: 'uppercase', color: dStat.color,
                }}>{dStat.label}</div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#666',
                  marginTop: 6,
                }}>
                  Claimed {formatDate(e.dateClaimed)}<br />
                  Source: {e.sourceName}
                </div>
                <div style={{
                  marginTop: 10, display: 'flex', gap: 6, alignItems: 'center',
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, fontWeight: 700,
                  color: '#fff', background: '#111', padding: '4px 10px',
                  width: 'fit-content',
                }}>
                  Assign reporter →
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Counter({ n, label, color }) {
  return (
    <div style={{
      fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#666',
      textAlign: 'right',
    }}>
      <span style={{
        fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
        color, marginRight: 4, verticalAlign: 'middle',
      }}>{n}</span>
      {label}
    </div>
  );
}

/* ─────── Pipeline / Sources view ─────── */
function PipelineView() {
  // Funnel numbers from header strip
  const stages = [
    { label: 'Sources polled', value: 7, sub: '6 active · 1 phase-2' },
    { label: 'Raw items fetched', value: 2871, sub: 'since 06:14 IST' },
    { label: 'Passed gate', value: 73, sub: 'plausibly contains dated claim' },
    { label: 'Extracted by LLM', value: 16, sub: 'structured events' },
    { label: 'Stored', value: 16, sub: '0 duplicates' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
      {/* Left: pipeline diagram + sources */}
      <div>
        <div style={{
          background: '#fff', border: `1px solid #111`, padding: '20px 24px',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
            marginBottom: 4,
          }}>This morning&#39;s run</div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
            color: '#111', marginBottom: 16, lineHeight: 1.15,
          }}>2,871 raw items → 16 calendar events</h2>

          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`,
            gap: 0, alignItems: 'stretch',
          }}>
            {stages.map((s, i) => (
              <div key={s.label} style={{ position: 'relative', paddingRight: 18 }}>
                {i < stages.length - 1 && (
                  <div style={{
                    position: 'absolute', right: 4, top: 24,
                    fontSize: 20, color: '#d4cfc6', fontWeight: 700,
                  }}>→</div>
                )}
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800,
                  color: '#111', lineHeight: 1, letterSpacing: '-.02em',
                }}>{s.value.toLocaleString()}</div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, fontWeight: 700,
                  color: '#111', marginTop: 4,
                }}>{s.label}</div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, color: '#888',
                  marginTop: 2,
                }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 18, padding: '10px 14px',
            background: '#eaf0ea', border: `1px solid #2D7A4F`,
            fontFamily: "'Noto Serif', serif", fontStyle: 'italic', fontSize: 13,
            color: '#1f5c38', lineHeight: 1.55,
          }}>
            The LLM agent is invoked only on the 73 candidates that pass the cheap pre-filter — not on every raw item.
            Everything else is plain Python: fetching, parsing, date arithmetic, storage. The whole run costs roughly
            <strong style={{ fontStyle: 'normal' }}> ₹4.20</strong> in API calls.
          </div>
        </div>

        <div style={{
          background: '#fff', border: `1px solid #111`, padding: '20px 24px',
        }}>
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
            marginBottom: 12,
          }}>Sources · adapter status</div>
          <div>
            {SOURCES.map(s => (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '24px 1fr 120px 80px 110px',
                gap: 12, padding: '11px 0', alignItems: 'center',
                borderBottom: `1px solid #e6e0d4`,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: s.active ? '#2D7A4F' : '#d4cfc6',
                }} />
                <div>
                  <div style={{
                    fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 700,
                    color: '#111',
                  }}>{s.label}</div>
                  {s.note && (
                    <div style={{
                      fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#888', marginTop: 1,
                    }}>{s.note}</div>
                  )}
                </div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#666',
                  letterSpacing: '.04em',
                }}>{s.kind}</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700,
                  color: '#111', textAlign: 'right',
                }}>{s.items.toLocaleString()}</div>
                <div style={{
                  fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, color: '#888',
                  textAlign: 'right',
                }}>{s.lastFetch}</div>
              </div>
            ))}
          </div>

          <button style={{
            marginTop: 14,
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 700,
            background: '#fff', color: '#111', border: `1px solid #111`,
            padding: '7px 14px', cursor: 'pointer', letterSpacing: '.04em',
          }}>
            + Add source adapter
          </button>
        </div>
      </div>

      {/* Right column — pipeline status / module health */}
      <div>
        <div style={{
          background: '#fff', border: `1px solid #111`, padding: '20px 22px', marginBottom: 24,
        }}>
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '.12em', textTransform: 'uppercase', color: '#888', marginBottom: 12,
          }}>Eight modules</div>
          {[
            { name: 'Sources',          kind: 'deterministic', ok: true, info: '6 adapters' },
            { name: 'Gate',             kind: 'deterministic', ok: true, info: 'keyword + date regex' },
            { name: 'Claim Extractor',  kind: 'LLM agent',     ok: true, info: 'gpt-5 · 73 calls' },
            { name: 'Date Normaliser',  kind: 'deterministic', ok: true, info: '128 test cases' },
            { name: 'Calendar Engine',  kind: 'deterministic', ok: true, info: 'pure functions' },
            { name: 'Store',            kind: 'integration',   ok: true, info: 'Postgres 16' },
            { name: 'Pipeline Runner',  kind: 'glue',          ok: true, info: 'cron 06:00 IST' },
            { name: 'Web View',         kind: 'glue',          ok: true, info: 'you are here' },
          ].map(m => (
            <div key={m.name} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
              borderBottom: `1px solid #e6e0d4`,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: m.ok ? '#2D7A4F' : '#D32B2B',
              }} />
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 700,
                color: '#111', flex: 1,
              }}>{m.name}</div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 600,
                letterSpacing: '.06em', textTransform: 'uppercase',
                color: m.kind === 'LLM agent' ? '#2D7A4F' : '#888',
              }}>{m.kind}</div>
            </div>
          ))}
        </div>
        <div style={{
          background: '#111', color: '#fff', padding: '18px 20px',
        }}>
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '.12em', textTransform: 'uppercase', color: '#a3a3a3',
          }}>Talking point</div>
          <div style={{
            fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700,
            color: '#fff', lineHeight: 1.35, marginTop: 6,
          }}>
            One LLM where judgment is required. Plain code everywhere else.
          </div>
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#bdbdbd',
            marginTop: 6, lineHeight: 1.55,
          }}>
            That is why this pipeline is fast, cheap and reliable — and why a 4-week solo build is enough to make it real.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ListView, PastDueView, PipelineView });
