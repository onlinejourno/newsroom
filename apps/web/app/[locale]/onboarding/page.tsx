import { redirect } from "next/navigation";

// Onboarding is superseded by the account flow (ADR 0055): registration with
// approval. Kept as a stable redirect so old links resolve.
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/register`);
}
