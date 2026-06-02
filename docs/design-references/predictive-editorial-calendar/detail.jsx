// detail.jsx — slide-in event detail drawer + month-grid mini view

function EventDrawer({ event, onClose }) {
  if (!event) return null;
  const isPast = event.delivered !== undefined;
  const d = daysBetween(TODAY_ISO, event.deadline);
  const bucket = bucketFor(d);
  const markers = leadTimeMarkers(event.deadline);

  return (
    <>
      {/* Scrim */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.35)',
        zIndex: 50,
      }} />
      {/* Drawer */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 520, maxWidth: '90vw',
        background: '#fff',
        borderLeft: `1px solid #111`,
        zIndex: 51, overflowY: 'auto',
        boxShadow: '-10px 0 30px rgba(17,17,17,0.15)',
      }}>
        {/* Header strip */}
        <div style={{
          background: '#111', color: '#fff',
          padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '.14em', textTransform: 'uppercase', color: '#a3a3a3',
            }}>
              {isPast ? 'Accountability follow-up' : 'Calendar entry'}
            </div>
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600,
              color: '#fff', marginTop: 4,
            }}>
              {event.id.toUpperCase()}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#fff', fontSize: 22,
            cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Beat + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <BeatTag beat={event.beat} />
            <div style={{
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 800,
              letterSpacing: '.12em', textTransform: 'uppercase', color: bucket.color,
              padding: '3px 8px', background: bucket.strip, border: `1px solid ${bucket.color}`,
            }}>
              {isPast ? `${Math.abs(d)}d past-due` : daysOutLabel(d).toUpperCase()}
            </div>
          </div>

          {/* What */}
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800,
            color: '#111', lineHeight: 1.2, marginBottom: 10,
            textWrap: 'pretty',
          }}>{event.what}</h2>

          {/* Who */}
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: '#444',
            marginBottom: 4,
          }}>
            <span style={{ color: '#888', textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 10, fontWeight: 700 }}>Promised by</span>
            &nbsp;{event.who}
          </div>
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: '#444',
            marginBottom: 18,
          }}>
            <span style={{ color: '#888', textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 10, fontWeight: 700 }}>At</span>
            &nbsp;{event.location || '—'}
          </div>

          {/* Key dates */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
            border: `1px solid #111`, marginBottom: 18,
          }}>
            <div style={{ padding: '14px 18px', borderRight: `1px solid #e6e0d4` }}>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
              }}>Deadline</div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
                color: '#111', marginTop: 3, lineHeight: 1,
              }}>{formatDate(event.deadline)}</div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#888',
                marginTop: 4,
              }}>{new Date(event.deadline + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long' })}</div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
              }}>Claim made</div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
                color: '#111', marginTop: 3, lineHeight: 1,
              }}>{formatDate(event.dateClaimed)}</div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#888',
                marginTop: 4,
              }}>{daysBetween(event.dateClaimed, event.deadline)} days notice</div>
            </div>
          </div>

          {/* Lead-time chevron */}
          {!isPast && (
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
                marginBottom: 8,
              }}>Lead-time markers</div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
              }}>
                {markers.map(m => {
                  const isCurrent = m.days <= d && (markers.find(x => x.days < m.days)?.days ?? 0) < d;
                  const passed = m.passed;
                  return (
                    <div key={m.days} style={{
                      padding: '8px 6px', textAlign: 'center',
                      background: passed ? '#efece4' : (isCurrent ? bucket.strip : '#fff'),
                      border: `1px solid ${passed ? '#d4cfc6' : (isCurrent ? bucket.color : '#d4cfc6')}`,
                      opacity: passed ? 0.55 : 1,
                    }}>
                      <div style={{
                        fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800,
                        color: passed ? '#888' : (isCurrent ? bucket.color : '#111'),
                        lineHeight: 1,
                      }}>{m.days}d</div>
                      <div style={{
                        fontFamily: "'Source Sans 3', sans-serif", fontSize: 9, color: '#888',
                        marginTop: 3,
                      }}>{formatDateShort(m.date)}</div>
                      {passed && (
                        <div style={{
                          fontFamily: "'Source Sans 3', sans-serif", fontSize: 8,
                          color: '#888', fontWeight: 700, letterSpacing: '.08em',
                          textTransform: 'uppercase', marginTop: 2,
                        }}>passed</div>
                      )}
                      {isCurrent && !passed && (
                        <div style={{
                          fontFamily: "'Source Sans 3', sans-serif", fontSize: 8,
                          color: bucket.color, fontWeight: 700, letterSpacing: '.08em',
                          textTransform: 'uppercase', marginTop: 2,
                        }}>NOW</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Original claim quote */}
          <div style={{
            fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
            marginBottom: 6,
          }}>Original claim — extracted text</div>
          <blockquote style={{
            fontFamily: "'Noto Serif', serif", fontSize: 15, lineHeight: 1.65,
            color: '#1A1A1A', fontStyle: 'italic',
            borderLeft: `3px solid #2D7A4F`, paddingLeft: 14,
            marginBottom: 18,
            textWrap: 'pretty',
          }}>
            “{event.originalText}”
          </blockquote>

          {/* Source */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14,
            padding: '12px 0', borderTop: `1px solid #e6e0d4`, borderBottom: `1px solid #e6e0d4`,
            marginBottom: 18,
          }}>
            <div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
              }}>Source</div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700,
                color: '#111', marginTop: 3,
              }}>{event.sourceName}</div>
              <a href={event.sourceUrl} style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#1f5c38',
                fontWeight: 600, textDecoration: 'underline',
                wordBreak: 'break-all', display: 'inline-block', marginTop: 4,
              }}>{event.sourceUrl}</a>
            </div>
            <div>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
              }}>Extractor confidence</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ConfidenceDots value={event.confidence} />
                <span style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800,
                  color: '#111',
                }}>{Math.round(event.confidence * 100)}%</span>
              </div>
              {event.fixed && (
                <div style={{
                  marginTop: 8, fontFamily: "'Source Sans 3', sans-serif", fontSize: 11,
                  color: '#2D7A4F', fontWeight: 600,
                }}>
                  ✓ Known event — verified against reference list
                </div>
              )}
            </div>
          </div>

          {/* Delivered status (past-due only) */}
          {isPast && (
            <div style={{
              marginBottom: 18, padding: '12px 14px',
              background: '#fdeaea', border: `1px solid #D32B2B`,
            }}>
              <div style={{
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 800,
                letterSpacing: '.12em', textTransform: 'uppercase', color: '#D32B2B',
              }}>Delivered?</div>
              <div style={{
                fontFamily: "'Noto Serif', serif", fontStyle: 'italic', fontSize: 14,
                color: '#1A1A1A', marginTop: 4, lineHeight: 1.55,
              }}>
                {event.delivered === 'overdue'    && 'Verification work indicates the promise has not been delivered. Assign a reporter to confirm and write the accountability story.'}
                {event.delivered === 'partial'    && 'Partial delivery on record. Worth a stocktake: what was delivered, what slipped, why.'}
                {event.delivered === 'unverified' && 'No verification yet. Status unknown — likely a strong pitch.'}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              flex: 1, fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 700,
              background: '#111', color: '#fff', border: 'none',
              padding: '11px 0', cursor: 'pointer', letterSpacing: '.04em',
            }}>
              Assign to reporter →
            </button>
            <button style={{
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 700,
              background: '#fff', color: '#111', border: `1px solid #111`,
              padding: '11px 14px', cursor: 'pointer', letterSpacing: '.04em',
            }}>
              Add to brief
            </button>
            <button style={{
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 700,
              background: '#fff', color: '#444', border: `1px solid #d4cfc6`,
              padding: '11px 14px', cursor: 'pointer',
            }}>
              Dismiss
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { EventDrawer });
