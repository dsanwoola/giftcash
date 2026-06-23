import type { UserProfile } from "@/lib/types";

export interface WithdrawalLimit {
  label: string;
  perWithdrawal: number;
  daily: number;
  note: string;
}

export const WITHDRAWAL_LIMITS: Record<UserProfile["kycStatus"], WithdrawalLimit> = {
  none: {
    label: "Starter",
    perWithdrawal: 25_000_00,
    daily: 25_000_00,
    note: "Verify your identity to withdraw more than ₦25,000 per day.",
  },
  pending: {
    label: "KYC pending",
    perWithdrawal: 25_000_00,
    daily: 25_000_00,
    note: "Your verification is being reviewed. Starter limits apply until approval.",
  },
  rejected: {
    label: "KYC rejected",
    perWithdrawal: 10_000_00,
    daily: 10_000_00,
    note: "Your verification needs attention before larger withdrawals are allowed.",
  },
  verified: {
    label: "Verified",
    perWithdrawal: 2_000_000_00,
    daily: 5_000_000_00,
    note: "Verified accounts can request larger payouts subject to admin review.",
  },
};

export function limitForKyc(status: UserProfile["kycStatus"] = "none") {
  return WITHDRAWAL_LIMITS[status] ?? WITHDRAWAL_LIMITS.none;
}
