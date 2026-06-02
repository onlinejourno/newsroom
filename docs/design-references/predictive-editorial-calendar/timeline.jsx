// timeline.jsx — the Forward Calendar (Gantt-style timeline of deadlines).
// Each row is one event. The band stretches from (deadline − 90d) to deadline.
// A vertical "today" line cuts across the canvas. Tick marks at 60/30/14/7/1 days before deadline.

const PHASE_BUCKETS = [
  { id: 'imminent', label: 'Commission now', sub: '7 days or less', min: 0,  max: 7,    color: '#b01e1e', strip: '#fdeaea' },
  { id: 'soon',     label: 'In the lead-time window', sub: '8 – 14 days', min: 8, max: 14, color: '#b35d00', strip: '#f7ecd9' },
  { id: 'month',    label: 'This month',  sub: '15 – 30 days',  min: 15, max: 30,   color: '#7a4f00', strip: '#f3eddd' },
  { id: 'quarter',  label: 'Foreseeable horizon', sub: '31 – 90 days', min: 31, max: 90, color: '#2D7A4F', strip: '#eaf0ea' },
  { id: 'beyond',   label: 'Beyond horizon', sub: '90+ days',  min: 91, max: 9999, color: '#666',     strip: '#efece4' },
];

function bucketFor(daysOut) {
  return PHASE_BUCKETS.find(p => daysOut >= p.min && daysOut <= p.max) || PHASE_BUCKETS[PHASE_BUCKETS.length - 1];
}

// Pretty "in N days / weeks"
function daysOutLabel(d) {
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d < 14) return `in ${d} days`;
  if (d < 60) return `in ${Math.round(d / 7)} weeks`;
  return `in ${Math.round(d / 30)} months`;
}

function ConfidenceDots({ value }) {
  // 5-dot scale
  const total = 5;
  const filled = Math.round(value * total);
  return (
    <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: i < filled ? '#111' : '#d4cfc6',
          display: 'inline-block',
        }} />
      ))}
    </span>
  );
}

function BeatTag({ beat }) {
  const b = BEATS.find(x => x.id === beat);
  if (!b) return null;
  return (
    <span style={{
      fontFamily: "'Source Sans 3', sans-serif",
      fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
      color: b.color,
      borderLeft: `2px solid ${b.color}`,
      paddingLeft: 6,
    }}>{b.label}</span>
  );
}

/* ─── Timeline row ───
   The visible canvas spans [today, today+horizon] in days.
   The event band spans [deadline-90, deadline] in event coordinates, clipped to canvas.
*/
function TimelineRow({ event, horizon, onSelect }) {
  const dToDeadline = daysBetween(TODAY_ISO, event.deadline);
  const bucket = bucketFor(dToDeadline);

  // Convert event-day to canvas %
  const px = (d) => Math.min(100, Math.max(0, (d / horizon) * 100));

  // Band endpoints in days-from-today
  const bandStartDays = Math.max(0, dToDeadline - 90);
  const bandEndDays   = Math.min(horizon, dToDeadline);

  const bandLeft = px(bandStartDays);
  const bandRight = px(bandEndDays);
  const bandWidth = Math.max(0.4, bandRight - bandLeft);

  // The "tail" exists if deadline-90 < today (band already in progress at canvas left)
  const tailClipped = dToDeadline - 90 < 0;
  // Or extends beyond horizon
  const headClipped = dToDeadline > horizon;

  // Markers — those falling within [0, horizon]
  const markers = [60, 30, 14, 7, 1]
    .map(m => ({ m, day: dToDeadline - m }))
    .filter(x => x.day >= 0 && x.day <= horizon);

  return (
    <button
      onClick={() => onSelect(event)}
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 230px',
        gap: 16,
        background: 'none', border: 'none', borderTop: `1px solid #e6e0d4`,
        padding: '14px 0',
        textAlign: 'left', cursor: 'pointer',
        width: '100%',
      }}
    >
      {/* LEFT — who & beat */}
      <div style={{ paddingRight: 8 }}>
        <BeatTag beat={event.beat} />
        <div style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 600,
          color: '#111', marginTop: 5, lineHeight: 1.3,
        }}>
          {event.who.split(',')[0]}
        </div>
        <div style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, color: '#888',
          marginTop: 1, lineHeight: 1.3,
        }}>
          {event.who.split(',').slice(1).join(',').trim() || event.location}
        </div>
      </div>

      {/* MIDDLE — timeline band */}
      <div style={{ position: 'relative', height: 58, alignSelf: 'center' }}>
        {/* Background lane */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 26, height: 6,
          background: '#efece4', borderTop: '1px solid #e6e0d4', borderBottom: '1px solid #e6e0d4',
        }} />

        {/* The band itself */}
        <div style={{
          position: 'absolute',
          left: `${bandLeft}%`,
          width: `${bandWidth}%`,
          top: 18, height: 22,
          background: bucket.strip,
          border: `1px solid ${bucket.color}`,
          borderLeft: tailClipped ? `1px dashed ${bucket.color}` : `1px solid ${bucket.color}`,
          borderRight: headClipped ? `1px dashed ${bucket.color}` : `1px solid ${bucket.color}`,
        }} />

        {/* Tail clipped indicator */}
        {tailClipped && (
          <div style={{
            position: 'absolute', left: 0, top: 20, height: 18,
            fontSize: 9, color: bucket.color, fontWeight: 700,
            fontFamily: "'Source Sans 3', sans-serif", lineHeight: '18px',
            paddingLeft: 2,
          }}>
            ◀ {Math.abs(dToDeadline - 90)}d ago
          </div>
        )}

        {/* Tick markers along band */}
        {markers.map(({ m, day }) => {
          const left = px(day);
          const passed = day === 0; // ?
          return (
            <div key={m} style={{
              position: 'absolute', left: `${left}%`, top: 16,
              width: 0, transform: 'translateX(-50%)',
            }}>
              <div style={{
                width: 1, height: 26, background: '#888', opacity: 0.6,
              }} />
              <div style={{
                fontSize: 9, color: '#666', fontFamily: "'Source Sans 3', sans-serif",
                fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', transform: 'translateX(-50%)',
              }}>
                {m}d
              </div>
            </div>
          );
        })}

        {/* Deadline flag */}
        {!headClipped && (
          <div style={{
            position: 'absolute', left: `${px(dToDeadline)}%`, top: 8,
            transform: 'translateX(-50%)',
          }}>
            <div style={{
              width: 0, height: 0, marginLeft: -1,
              borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
              borderTop: `8px solid ${bucket.color}`,
            }} />
            <div style={{
              width: 2, height: 30, background: bucket.color, margin: '0 auto', marginTop: -1,
            }} />
            <div style={{
              fontFamily: "'Source Sans 3', sans-serif",
              fontSize: 10, fontWeight: 700, color: bucket.color,
              whiteSpace: 'nowrap', transform: 'translateX(-50%)',
              marginTop: 2,
            }}>
              {formatDateShort(event.deadline)}
            </div>
          </div>
        )}

        {/* Beyond-horizon arrow */}
        {headClipped && (
          <div style={{
            position: 'absolute', right: 0, top: 20, height: 18,
            fontSize: 10, color: bucket.color, fontWeight: 700,
            fontFamily: "'Source Sans 3', sans-serif", lineHeight: '18px',
          }}>
            {formatDateShort(event.deadline)} ▶
          </div>
        )}
      </div>

      {/* RIGHT — promise + cta */}
      <div style={{ paddingLeft: 8, borderLeft: `1px solid #e6e0d4` }}>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700,
          color: '#111', lineHeight: 1.3, marginBottom: 4,
          textWrap: 'pretty',
        }}>
          {event.what}
        </div>
        <div style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#666',
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ color: bucket.color, fontWeight: 700 }}>
            {daysOutLabel(dToDeadline)}
          </span>
          <span style={{ color: '#d4cfc6' }}>·</span>
          <ConfidenceDots value={event.confidence} />
          <span>{Math.round(event.confidence * 100)}%</span>
          <span style={{ color: '#d4cfc6' }}>·</span>
          <span>{event.sourceName}</span>
        </div>
      </div>
    </button>
  );
}

/* ─── Time-axis ruler ─── */
function TimeAxis({ horizon }) {
  // Ticks at 0, 7, 14, 30, 60, 90 (filtered by horizon)
  const ticks = [0, 7, 14, 30, 60, 90, 120, 150, 180].filter(t => t <= horizon);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '180px 1fr 230px',
      gap: 16,
      padding: '12px 0 6px',
      borderBottom: `2px solid #111`,
      background: '#fff',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div style={{
        fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
        letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
      }}>Who promised</div>

      <div style={{ position: 'relative', height: 22 }}>
        {ticks.map(t => {
          const left = (t / horizon) * 100;
          const date = addDays(TODAY_ISO + 'T00:00:00', t);
          return (
            <div key={t} style={{
              position: 'absolute', left: `${left}%`, top: 0,
              transform: t === 0 ? 'translateX(0)' : (t === horizon ? 'translateX(-100%)' : 'translateX(-50%)'),
              fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
              color: t === 0 ? '#D32B2B' : '#666',
            }}>
              <div style={{ letterSpacing: '.05em' }}>
                {t === 0 ? 'TODAY' : `+${t}d`}
              </div>
              <div style={{ fontWeight: 500, color: '#888', marginTop: 1 }}>
                {formatDateShort(date)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, fontWeight: 700,
        letterSpacing: '.12em', textTransform: 'uppercase', color: '#888',
        paddingLeft: 8, borderLeft: `1px solid #e6e0d4`,
      }}>Promise & lead-time</div>
    </div>
  );
}

/* ─── Today vertical line — overlay across entire band column ─── */
function TodayLine() {
  // 180 + 16 (gap) on the left of band column. Band column ends 230+16 from the right.
  return (
    <div style={{
      position: 'absolute',
      left: 'calc(180px + 16px)',
      right: 'calc(230px + 16px)',
      top: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 1,
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 2, background: '#D32B2B', opacity: 0.95,
      }} />
    </div>
  );
}

/* ─── Bucket section ─── */
function BucketSection({ bucket, events, horizon, onSelect }) {
  if (!events.length) return null;
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        padding: '12px 0 6px',
        borderBottom: `1px solid #d4cfc6`,
        marginBottom: 0,
      }}>
        <div style={{
          width: 8, height: 8, background: bucket.color, marginRight: 2,
        }} />
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800,
          color: '#111',
        }}>
          {bucket.label}
        </div>
        <div style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, fontWeight: 600,
          letterSpacing: '.06em', textTransform: 'uppercase', color: bucket.color,
        }}>
          {bucket.sub}
        </div>
        <div style={{
          fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, color: '#888',
          marginLeft: 'auto',
        }}>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </div>
      </div>
      <div>
        {events.map(e => <TimelineRow key={e.id} event={e} horizon={horizon} onSelect={onSelect} />)}
      </div>
    </section>
  );
}

/* ─── Main timeline view ─── */
function TimelineView({ events, horizon, onSelect }) {
  // Bucket events by phase
  const buckets = PHASE_BUCKETS.map(b => ({
    bucket: b,
    events: events
      .filter(e => {
        const d = daysBetween(TODAY_ISO, e.deadline);
        return d >= b.min && d <= b.max;
      })
      .sort((a, b) => daysBetween(TODAY_ISO, a.deadline) - daysBetween(TODAY_ISO, b.deadline)),
  }));

  return (
    <div style={{
      background: '#fff',
      border: `1px solid #111`,
      padding: '0 24px 20px',
      position: 'relative',
    }}>
      <TimeAxis horizon={horizon} />
      <TodayLine />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {buckets.map(b => (
          <BucketSection key={b.bucket.id} bucket={b.bucket} events={b.events} horizon={horizon} onSelect={onSelect} />
        ))}
        {events.length === 0 && (
          <div style={{
            padding: '60px 0', textAlign: 'center',
            fontFamily: "'Noto Serif', serif", fontStyle: 'italic', color: '#888',
          }}>
            No events match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  TimelineView, PHASE_BUCKETS, bucketFor, daysOutLabel, ConfidenceDots, BeatTag,
});
