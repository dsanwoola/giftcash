import { GiftPaymentComplete } from "@/components/gift/gift-payment-complete";

export default async function GiftCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; slug?: string; reference?: string; reason?: string }>;
}) {
  const params = await searchParams;
  return <GiftPaymentComplete {...params} />;
}
