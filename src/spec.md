# Specification

## Summary
**Goal:** Enable the full Internal Login flow on `/internal/login` using Internet Identity login and backend role validation/claim checks, while keeping the rest of the app unchanged.

**Planned changes:**
- Modify only `frontend/src/pages/internal/InternalLogin.tsx` to implement the “Model A” login flow using existing Internet Identity and actor hooks (no new auth implementation, no direct fetch).
- Add the required UI state machine and sequencing: call `isSuperadminClaimed()` exactly once on mount; allow II login via button; do not auto-call `getCallerUser()` after II login; no auto-redirect on mount.
- Update the role grid to always show 8 selectable role cards with exact keys: `admin`, `asistenmu`, `concierge`, `strategicpartner`, `manajer`, `finance`, `management`, `superadmin`; selecting clears warning text.
- Implement “Ruang kerja” gating (enabled only when II logged in + role selected) and on-click decision tree: call `getCallerUser()` once, handle unregistered/mismatch/status warnings, and redirect only to the fixed mapped dashboard route on success.
- Implement Superadmin claim UI/logic in the Superadmin card area (visibility conditions, `claimSuperadmin()` call, loading state, claimed/already-claimed outcomes, redirect on successful claim).
- Preserve existing layout/styling and add only minimal UI elements needed (enabled/disabled states, Superadmin claim button placement, and warning text area), with defensive error handling to avoid crashes.

**User-visible outcome:** Users can log in with Internet Identity on the Internal Login page, select an internal role, and enter the correct dashboard only after backend validation; Superadmin can be claimed from the Superadmin card when available, and clear warnings are shown for unregistered, mismatched role, pending approval, or backend errors.
