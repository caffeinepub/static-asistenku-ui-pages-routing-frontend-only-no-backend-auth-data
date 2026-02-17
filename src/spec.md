# Specification

## Summary
**Goal:** Add a new backend-only “Layanan V4” feature to the canister in an append-only manner, enabling internal-managed service instances with dedicated storage, authorization, and CRUD/list APIs.

**Planned changes:**
- Append new Motoko code at the end of `backend/main.mo` only (no edits to existing lines; no new files).
- Define public `LayananTypeV4` and `LayananV4` types exactly as specified.
- Add V4-only stable storage (`layananV4Counter`, `layananV4Store`, `layananV4IndexByClient`) plus runtime maps (`layananV4ById`, `layananV4IdsByClient`) and keep them consistent on mutations.
- Implement LV4 ID generation using `LV4-<Nat>` based on a monotonically increasing counter.
- Add an internal-only authorization helper allowing only roles `superadmin`, `admin`, or `finance`, trapping exactly `"Unauthorized"` otherwise.
- Implement internal-only public methods: `createLayananV4`, `editLayananV4`, `setLayananV4Active`, `archiveLayananV4`, `listAllLayananV4`, `listLayananV4ByClient` with the specified validations, traps, and archive/active behavior.
- Run a compile sanity pass to ensure `backend/main.mo` builds and existing public APIs/behavior remain unchanged.

**User-visible outcome:** Internal callers (superadmin/admin/finance) can create, edit, activate/deactivate, archive, and list Layanan V4 records via new backend methods, while all existing functionality remains unchanged.
