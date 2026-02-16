# Specification

## Summary
**Goal:** Fix InternalLogin’s Superadmin claim flow so the claim-status check runs promptly when the backend actor is ready, successful claims hide the claim card without redirect, and claim errors only show when the claim truly fails.

**Planned changes:**
- Update `frontend/src/pages/internal/InternalLogin.tsx` to trigger a one-time `isSuperadminClaimed()` check immediately after `actor` exists and `actorFetching === false`, avoiding multi-minute delays and preventing repeated/spam checks.
- Change the claim success behavior to permanently hide the “Claim Superadmin” card after `actor.claimSuperadmin()` succeeds, with no navigation/redirect and no other backend mutations triggered from the claim handler.
- Improve claim error handling: if `claimSuperadmin()` throws, perform exactly one follow-up `isSuperadminClaimed()` re-check; if claimed, treat as success (hide card, no error, no redirect), otherwise show a single friendly error message without exposing raw backend authorization text.

**User-visible outcome:** After logging in, the “Claim Superadmin” card appears promptly when applicable; claiming Superadmin hides the card permanently with no redirect; and error messages appear only when the claim genuinely fails (with a user-friendly message).
