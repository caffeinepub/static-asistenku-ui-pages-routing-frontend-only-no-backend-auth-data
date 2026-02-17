# Specification

## Summary
**Goal:** Convert the Client dashboard into a single-page, phase-based workspace (no tabs) that dynamically reads the client’s active service and tasks on mount, then renders either an inactive-service waiting screen or an active, phase-driven workspace UI.

**Planned changes:**
- Update only `frontend/src/pages/dashboards/ClientDashboard.tsx` to trigger exactly two reads on mount: active service query (e.g., `getMyActiveServicesV4()`) and `listMyTasks()`, storing local state including `hasActiveService`, `tasks`, and `activeBucket` (default `null`).
- If no active service, render the provided centered waiting message and do not render the workspace UI.
- If active service exists, render a single-page workspace with a premium greeting area, a 4-row vertical narrative status list (clickable rows) that sets `activeBucket`, a filtered task-card list, and a collapsible History (Riwayat) section.
- Implement the locked TaskPhase-to-bucket mapping and rules, including: `#dibatalkan_client` excluded from main buckets and shown only in History; Delegation narrative copy switching based on `unitTerpakai`/`assignedPartner`; and strict Cancel visibility only for fresh `#permintaan_baru` with both fields null.
- Keep styling largely intact while applying minimal adjustments: centered container (~720px max width), muted/premium feel, serif headings + warm sans body, subtle gold vertical narrative line, and non-aggressive status labeling; include defensive non-crashing error/actor-not-ready handling.

**User-visible outcome:** Clients see a single-page dashboard that either shows a calm waiting screen (if no active service) or an active workspace where they can select a phase narrative row to filter tasks, view task details (including Review/Revisi behavior), and review canceled items in History—without tabs or route changes.
