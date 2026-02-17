# Specification

## Summary
**Goal:** Enable Internet Identity login and manual workspace/registration flows for external Client and Partner login/register pages, using existing backend methods and routes, without changing any other files.

**Planned changes:**
- Create/update only these four page files to add Internet Identity (II) login gating, loading/error states, and manual navigation triggered only by button clicks: `frontend/src/pages/external/ClientLogin.tsx`, `frontend/src/pages/external/PartnerLogin.tsx`, `frontend/src/pages/external/ClientRegister.tsx`, `frontend/src/pages/external/PartnerRegister.tsx`.
- Implement external Client/Partner login behavior using `useInternetIdentity()` + `useActor()` with explicit local state (`isLoggedInII`, `isLoadingII`, `isLoadingWorkspace`, `error`), including an enabled “Login Internet Identity” button and a “Masuk ke ruang kerja” button that calls `actor.getCallerUser()` only when clicked.
- Add role-based workspace decision handling on login: route to the existing register page if unregistered, show the exact mismatch error message `Silahkan klik sesuai dengan akun anda` (with a back-to-login button) on role mismatch, and navigate to the existing role dashboard on success; never auto-call `getCallerUser()` on mount.
- Implement external Client/Partner registration pages with controlled form fields, II gating (enabled “Login Internet Identity” button shown when not logged in), validation-based “Daftar” enablement, and submit handlers that call existing backend registration methods for each role without introducing new backend code.
- After successful registration, replace the form with a success state showing `Pendaftaran berhasil` and a manual “Masuk ke ruang kerja” button that calls `actor.getCallerUser()` once and navigates to the existing role dashboard.
- Apply anti-double-submit protections across all actions (II login, workspace, submit) by disabling buttons during loading/submitting, guarding handlers, clearing errors on new attempts, and resetting loading flags in `finally`; show an error banner whenever `error` is non-null and handle null/initializing actor safely.

**User-visible outcome:** Users on the external Client/Partner pages can log in with Internet Identity, then manually enter their workspace (or be directed to the correct registration page), and can register with validated forms using II—seeing clear success/error states—without any automatic redirects.
