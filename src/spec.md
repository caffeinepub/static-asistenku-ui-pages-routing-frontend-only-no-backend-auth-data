# Specification

## Summary
**Goal:** Make the Superadmin claim flow independent from role selection, hide it once claimed, and prevent claim calls when the actor isn’t ready—by updating only `frontend/src/pages/internal/InternalLogin.tsx`.

**Planned changes:**
- Add a dedicated, separate “Claim Superadmin” card/section that is shown only when `iiLoggedIn === true`, `claimCheckDone === true`, and `superadminClaimed === false`, and does not require `selectedRole === "superadmin"`.
- Keep the existing role selection grid behavior unchanged, including still requiring a role selection for the “Ruang kerja” action.
- Harden the “Claim Superadmin” button handler: if `actor` is missing or `actorFetching` is true, exit early and show an inline warning using the existing `warningText` area (no crash, no backend call).
- Keep the claim mutation behavior the same: call only `actor.claimSuperadmin()`. On success set `superadminClaimed = true`, hide the claim card, and navigate to `/superadmin/dashboard`. If already claimed, set `superadminClaimed = true`, hide the claim card, and show an inline warning (no redirect).

**User-visible outcome:** Logged-in II users can claim Superadmin from a dedicated section without selecting the Superadmin role; the claim UI disappears after claiming (or if already claimed), and clicking claim while the backend actor isn’t ready shows a warning instead of failing.
