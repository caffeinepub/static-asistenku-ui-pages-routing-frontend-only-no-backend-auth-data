# Specification

## Summary
**Goal:** Fix the Internal Login “Claim Superadmin” flow so it only calls the intended backend claim method, hides the claim UI once superadmin is already claimed, and handles actor-not-ready states without crashing.

**Planned changes:**
- Update `frontend/src/pages/internal/InternalLogin.tsx` so the “Claim Superadmin” click handler triggers only `actor.claimSuperadmin()` and does not invoke any profile/role-assignment mutations (directly or indirectly).
- Add a one-time on-mount check in `InternalLogin.tsx` that calls `actor.isSuperadminClaimed()` exactly once when an actor is available, storing the result in `superadminClaimed`.
- Gate the “Claim Superadmin” button so it is shown only when `iiLoggedIn === true`, `selectedRole === "superadmin"`, and `superadminClaimed === false`.
- Harden `InternalLogin.tsx` against actor readiness issues by preventing claim/check/workspace backend calls when the actor is missing/initializing and showing a small inline warning instead of attempting the call.
- Ensure the page renders without runtime errors for anonymous users and when backend calls fail, keeping the existing layout (centered container, main card, footer) with only minimal UI additions.

**User-visible outcome:** Users can claim superadmin without triggering the “Unauthorized: Only admins can assign user roles” error path; the claim option disappears once superadmin has been claimed; and if the backend actor isn’t ready, the page shows a non-crashing inline warning instead of failing.
