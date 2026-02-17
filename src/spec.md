# Specification

## Summary
**Goal:** Add an append-only Superadmin “Ringkasan V1” real-time summary sourced from existing Task/LayananV4/User storages, and display it in the Superadmin dashboard Ringkasan tab with minimal new UI state and safe loading/error handling.

**Planned changes:**
- Append-only update to `backend/main.mo` to add a new `SuperadminSummaryV1` type and a gated `getSuperadminSummaryV1()` query that computes metrics read-only from existing maps (`taskById`, `layananV4ById`, `userRoles`, `userStatusByPrincipal`, and `partnerLevelByPrincipal` if present).
- Implement Ringkasan computations using the specified semantics: task active vs selesai based on `TaskPhase`, layanan active based on `isActive`/`isArchived`, and GMV total as `unitTotal * hargaPerUnit` summed across Layanan V4.
- Modify only `frontend/src/pages/dashboards/SuperadminDashboard.tsx` to add a Ringkasan V1 block that fetches `actor.getSuperadminSummaryV1()` only when the Ringkasan tab is active and the actor is ready, with minimal local state (`summaryV1`, `summaryV1Loading`, `summaryV1Error`) and a per-section Refresh control.
- Add frontend sanity handling so anonymous/initializing/missing-method cases do not crash the dashboard and show calm English error text.

**User-visible outcome:** Superadmins can view a new Ringkasan V1 summary section in the Ringkasan tab (with loading/error states and a Refresh action) showing real-time totals computed from existing stored tasks and layanan, without impacting other dashboard tabs.
