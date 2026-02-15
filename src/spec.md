# Specification

## Summary
**Goal:** Add an append-only “Layanan Asistenku V2” metadata block to the bottom of `backend/main.mo` to support per-layanan metadata storage and access methods without changing existing (V1) types, storage, or behavior.

**Planned changes:**
- Append a new section at the very bottom of `backend/main.mo` (before the actor’s final `}`) with the exact header comment `// --- LAYANAN ASISTENKU V2 (APPEND ONLY, NO MIGRATION) ---`.
- Add a new public type `LayananMeta` with the specified fields and types (without modifying the existing `LayananAsistenku` type).
- Add new in-canister maps `layananMetaById` and `layananIdsByOwnerClient` with the exact names and types.
- Reuse existing helper functions for `now()` and `requireAdminOrSuperadminImpl(caller)` if present; otherwise define them in the appended block.
- Append new V2 public methods: `createLayananForClientV2`, `setLayananActiveV2`, `listMyLayananV2`, `getLayananMeta`, and `getMyLayananMeta` with the specified signatures, authorization/authentication checks, and exact return strings.

**User-visible outcome:** Admin/superadmin can create and manage V2 layanan metadata and activation status, while authenticated users can list their layanan IDs and fetch their own layanan metadata when they are the owner.
