import { Redirect } from 'expo-router';

// The referral claim is now a sheet over gym discovery; keep this route for old links.
export default function ClaimReferralRoute() {
  return <Redirect href="/(member)/centers?claimReferral=1" />;
}
