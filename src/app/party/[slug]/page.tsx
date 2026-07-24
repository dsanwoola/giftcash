import { EventPage } from "@/components/event/event-page";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventPage slug={slug} />;
}
