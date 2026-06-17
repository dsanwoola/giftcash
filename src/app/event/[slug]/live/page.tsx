import { PartyScreen } from "@/components/party/party-screen";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PartyScreen slug={slug} />;
}
