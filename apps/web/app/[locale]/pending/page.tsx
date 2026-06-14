export const dynamic = "force-static";

export default async function PendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div
        className="ds-frame max-w-md w-full p-8 text-center"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <p className="ds-label mb-2">OnlineJourno</p>
        <h1
          className="text-3xl font-extrabold tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Awaiting approval
        </h1>
        <p
          className="text-base mb-6"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Your account is registered and waiting for an editor to approve it.
          You&rsquo;ll be able to sign in once it&rsquo;s cleared — usually the
          same working day.
        </p>
        <a
          className="underline text-sm"
          href={`/${locale}/login`}
          style={{ color: "var(--color-brand)" }}
        >
          Back to sign in
        </a>
      </div>
    </main>
  );
}
