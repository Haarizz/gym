# Gap-Resolution Summary

1. **Idempotency and Transactions**: Verified that `MemberService.createMember` relies on default `@Transactional` which routes correctly per tenant via `TenantContextHolder`. The idempotency mechanism (compare-and-set lease locking) will be implemented to run entirely on the tenant DB to ensure cross-transaction consistency with membership records. 
2. **Billing and Eligibility**: `MemberService.enforceFamilyMemberCaps` accurately guards max members. However, we will ensure that `MobileFamilyPurchaseService` rigorously verifies the requested plan and ignores any client-supplied zero fees for independently billed members.
3. **Membership Uniqueness**: We will use `existsByGlobalUserId` explicitly in the context of the current tenant to allow cross-tenant memberships but prevent intra-tenant duplicates.
4. **Payment Recovery**: Confirmed that `MobileDiscoveryController.purchaseMembership` relies completely on the mobile client for payment success state. Our new family purchase controller will mirror this behavior but strictly wrap it in the idempotency lease loop to safely manage retries for the *backend* payload portion, documenting the gateway payment debt.
5. **Invitation Security**: `linkGlobalUser` is present and functional. We will implement `MobileFamilyClaimService` to safely map the JWT `email` claim to the token's target email before claiming and executing the linking.

# File-by-File Implementation Plan
* **Entities**: `MobileFamilyInvitation`, `MobileIdempotencyRecord`
* **Repositories**: `MobileFamilyInvitationRepository`, `MobileIdempotencyRecordRepository`
* **Services**: `MobileFamilyPurchaseService`, `MobileFamilyClaimService`, `MobileFamilyViewService`, `MobileFamilyInvitationService`, `MobileIdempotencyService`
* **Controllers**: `MobileFamilyPurchaseController`, `MobileFamilyClaimController`, `MobileFamilyViewController`
* **Mobile Domain**: `useFamilyPurchase.ts`, `useClaimInvitation.ts`, `useMyFamily.ts`, `familyMembershipApi.ts`, `FamilyModels.ts`
* **Mobile Screens**: `FamilyGroupScreen.tsx`, `ClaimInvitationScreen.tsx`
