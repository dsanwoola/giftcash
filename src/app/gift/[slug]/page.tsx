import { RevealExperience } from "@/components/reveal/reveal-experience";

export default async function GiftRevealPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RevealExperience slug={slug} />;
}
