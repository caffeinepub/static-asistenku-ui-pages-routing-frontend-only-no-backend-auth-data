# Specification

## Summary
**Goal:** Patch the backend to prevent profile overwrites, correct internal role typing, and introduce a stable per-principal `userId` with a query to retrieve it.

**Planned changes:**
- Modify `backend/main.mo` so `saveCallerUserProfile(profile : UserRole)` keeps its public signature but always traps with `Disabled: profile saving must use register* or admin-approved flows only.` and performs no state writes.
- Update `InternalRole` to include only `#admin`, `#finance`, `#concierge`, and `#asistenmu` (remove any `#superadmin` usage), while keeping `UserRole.#superadmin` unchanged and leaving `InternalProfile` unchanged.
- Add `nextUserId`, `userIdByPrincipal`, and helper functions `genUserId()` / `ensureUserId(p)` to assign consistent `U1`, `U2`, ... IDs without adding `userId` fields to any profile record types.
- Ensure `ignore ensureUserId(caller);` runs immediately before any `userRoles.add(caller, entry);` in `registerClient`, `registerPartner`, `registerInternal`, and before `superadminClaimed := true;` in `claimSuperadmin()`.
- Add `public query ({ caller }) func getMyUserId() : async ?Text { userIdByPrincipal.get(caller); }` in the “User Queries” section.

**User-visible outcome:** Profile-saving via `saveCallerUserProfile` is disabled (calls trap), internal roles no longer include superadmin, users receive a stable `U...` identifier upon successful registration or superadmin claim, and can query their userId via `getMyUserId()`.
