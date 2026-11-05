export function hasActivePremium(user: {
  isPremium?: boolean;
  premiumUntil?: Date | null;
  stripeSubscriptionId?: string | null;
} | null | undefined): boolean {
  if (!user?.isPremium) return false;
  if (user.stripeSubscriptionId) return true;
  if (user.premiumUntil && user.premiumUntil.getTime() > Date.now()) return true;
  return !user.premiumUntil;
}
