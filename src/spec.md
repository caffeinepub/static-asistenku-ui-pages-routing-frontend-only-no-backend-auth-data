# Specification

## Summary
**Goal:** Allow the first eligible authenticated user to successfully claim superadmin by bootstrapping the initial admin role without using the admin-gated role assignment helper.

**Planned changes:**
- In `backend/main.mo`, inside `claimSuperadmin()`, replace the single `AccessControl.assignRole(...)` line with direct writes to `accessControlState` (`userRoles.add` and `adminAssigned := true`) while keeping all other logic and ordering unchanged.
- Verify the backend compiles and that the first superadmin claim no longer fails with “Only admins can assign user roles”.

**User-visible outcome:** The “Claim Superadmin” action succeeds for the first eligible authenticated user and no longer errors with “Only admins can assign user roles”.
