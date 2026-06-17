import { TableTents } from "@/components/party/table-tents";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TableTents slug={slug} />;
}
