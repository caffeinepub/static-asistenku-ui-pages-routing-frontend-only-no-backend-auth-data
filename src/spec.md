# Specification

## Summary
**Goal:** Improve the Internal Login page UX by preventing early Superadmin-claim interactions before the backend actor is ready, and by turning the post-login Internet Identity button into a true logout action.

**Planned changes:**
- Update `frontend/src/pages/internal/InternalLogin.tsx` to hide (not render) the "Claim Superadmin" section while `iiLoggedIn === true` but the actor is not ready (`actor` is null/undefined or `actorFetching === true`), then allow it to render again once ready (still respecting existing conditions like `claimCheckDone === true` and `superadminClaimed === false`).
- Keep the existing Claim Superadmin click handler guard so it early-returns when the actor is not ready and shows an inline warning via the existing warning mechanism (without calling the backend).
- Update `frontend/src/pages/internal/InternalLogin.tsx` so after a successful Internet Identity login (`iiLoggedIn === true`), the button label becomes "Logout" and clicking it calls the existing Internet Identity context logout/clear function.
- After logout, reset the UI to a safe default state (logged-out state with role selection/warnings reset) without modifying any other pages/files.

**User-visible outcome:** Users won’t see or be able to click "Claim Superadmin" until the backend is ready (avoiding repeated “Backend belum siap” warnings), and once logged in via Internet Identity they can click "Logout" to properly sign out and return to a stable logged-out UI.
