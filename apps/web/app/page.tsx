import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <Image
          src="/brand/logo-mark.png"
          alt="OnlineJourno"
          width={140}
          height={140}
          priority
          className="mx-auto mb-10"
        />

        <p className="ds-label mb-4">OnlineJourno · Platform</p>

        <h1
          className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Editorial intelligence,
          <br />
          built by journalists.
        </h1>

        <p
          className="text-lg md:text-xl mb-10"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
            lineHeight: 1.55,
          }}
        >
          Source monitoring, story-thread tracking, and AI-assisted brief
          delivery — journalist-first, configurable per newsroom.
        </p>

        <hr className="ds-rule my-10" />

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          <div>
            <p className="ds-label mb-2">Status</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Wk 1 — scaffolding
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Licence</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Apache 2.0
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Maintainer</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Subhash Rai (solo)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
