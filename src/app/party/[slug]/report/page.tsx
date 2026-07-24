import { EventReportPage } from "@/components/event/event-report-page";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventReportPage slug={slug} />;
}
