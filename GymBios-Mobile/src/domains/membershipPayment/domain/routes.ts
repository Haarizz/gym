/** Expo Router path of the payment screen — shared by the Membership screen and push deep links. */
export const membershipPaymentPath = (membershipId: number) => `/membership-payment/${membershipId}` as const;
