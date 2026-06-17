import { GroupGiftPage } from "@/components/group/group-gift-page";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GroupGiftPage slug={slug} />;
}
