// Neutral placeholder for "Your framing this week". Lights up once Phase B's
// framing data (frame_group on stories) is live on this tenant. Honest-data:
// no fabricated fingerprint.
export default function FramingFingerprintStub() {
  return (
    <div className="mini-frame">
      <h3 className="mini-frame__title">Your framing this week</h3>
      <p className="mini-frame__sub ds-amber">Lights up once framing analysis is live for your newsroom.</p>
      <div
        style={{
          height: 22,
          borderRadius: 2,
          marginTop: 10,
          background:
            "repeating-linear-gradient(135deg, var(--color-paper-card), var(--color-paper-card) 6px, var(--color-rule) 6px, var(--color-rule) 7px)",
        }}
        aria-hidden
      />
    </div>
  );
}
