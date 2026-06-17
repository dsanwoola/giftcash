import { HostConsole } from "@/components/party/host-console";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HostConsole slug={slug} />;
}
