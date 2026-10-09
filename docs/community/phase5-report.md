# Global Community — Phase 5 Report: Legacy Compatibility Adapter

**Status:** implemented and tested locally. Inert until `authority = GLOBAL`,
which can only happen through the gated cutover.

The endpoint-by-endpoint contract, including every intended behavior
difference, is in `phase5-adapter-contract.md`.

## One authoritative store at every moment

| Authority | Old `/api/community/**` endpoints | New endpoints |
|---|---|---|
| `LEGACY` | Legacy service and legacy tables, exactly as before | Off (database-enforced) |
| `GLOBAL` | **Adapter → global store** | Available as rolled out |

There is no second flag: the adapter switch *is* the authority flag, and the
database forbids moving authority back. The adapter **fails closed**:

- Only a missing rollout table (V6 not deployed, SQLSTATE 42P01) means
  "legacy" — so deploying this code before V6 is safe.
- Any other failure to read the state is a 503, never a fall-back.
- Once a process has seen `GLOBAL`, it never serves the legacy tables again,
  even if the control plane becomes unreadable.

## Change to an existing file (rule 21)

| File | Why | Behavior change | Compatibility | Rollback |
|---|---|---|---|---|
| `controllers/CommunityController.java` (35 lines) | After cutover, old clients must write to the only authoritative store | Each call site chooses adapter or legacy service by authority; mappings, try/catch blocks and status codes are unchanged | Legacy branch is byte-for-byte the old call; response DTO classes are the same | Before cutover: nothing to roll back (adapter unused). After: fix forward (one-way authority) |

## New code

| File | Purpose |
|---|---|
| `community/global/LegacyCommunityCompatAdapter.java` | Serves the 12 legacy endpoints from the global store, through the same identity boundary, policy and write paths as the new API |
| `GlobalCommunityService`, `CommunityPostStore` (small changes) | Surface `LEGACY` (available right after cutover, independent of pilot flags); posts written through the old API are **GYM** visibility |

## Tests

| Suite | Result | Covers |
|---|---|---|
| `LegacyAdapterGoldenIT` | **8 pass** | **Golden shapes for every endpoint**: the real legacy `CommunityService` output vs the adapter's, same field names and JSON types at every level; gym scoping (another gym's posts unreachable, even by global ID); legacy IDs resolved by stored key within the caller's gym (the same legacy ID in another gym is a different post); toggle semantics; author IDs in each author's own identity space (global 42 vs tenant 42); archived-own-only and branch scope; membership now checked; legacy error types; fail-closed after GLOBAL |
| `CommunityControllerRoutingTest` | **4 pass** | LEGACY → legacy only (adapter untouched); GLOBAL → adapter only (legacy untouched); legacy status mapping kept; unreadable state → 503 with no legacy call |
| `LegacyCommunityCompatAdapterActivationTest` | **2 pass** | Before V6: legacy; any other failure: 503 |
| Whole backend | **221 tests, 0 failures** apart from the known full-context/V5 environment case, which passes against a clean control plane | Full application boots with the adapter wired in |

## Production-gated items

None new: the adapter only acts after the gated cutover.
