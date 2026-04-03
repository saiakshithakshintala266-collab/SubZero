export type SubscriptionStatus = "active" | "flagged" | "running" | "cancelled" | "idle";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: "monthly" | "annual";
  nextBill?: string;
  lastUsed?: string;
  status: SubscriptionStatus;
  logoChar?: string;
  logoBg?: string;
  logoColor?: string;
}
