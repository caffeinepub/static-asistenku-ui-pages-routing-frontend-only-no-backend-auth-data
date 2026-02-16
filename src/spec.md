# Specification

## Summary
**Goal:** Prevent double-submit in Superadmin Master Data actions, improve soft-delete visibility for Kamus/Aturan, and make the Ringkasan tab reliably fetch and refresh summary data.

**Planned changes:**
- Add per-section in-flight “saving guards” in `SuperadminDashboard.tsx` (`kamusSaving`, `aturanSaving`, `mapSaving`, `konstantaSaving`) so each Master Data mutation exits early if already in progress, sets the guard before awaiting actor mutations, and resets it in `finally`.
- Disable relevant action buttons while saving (and when `actor` is unavailable or `actorFetching` is true) and change button labels during in-flight actions to exactly: “Saving...”, “Deleting...”, “Updating...”.
- Remove/avoid any Master Data dialog form submit paths that can double-trigger mutations; ensure non-submit buttons use `type="button"` and mutations are invoked only via explicit `onClick` handlers combined with saving guards.
- Implement soft-delete UX rules for “Kamus Pekerjaan” and “Aturan Beban”: default active-only (`aktif === true`) table view, per-section toggle labeled exactly “Show Archived”, refresh data after soft delete, and show status badges (“Active” green; “Archived” gray only when archived items are shown).
- Make the Ringkasan tab fetch and render backend summary data when opened and on Refresh, and also compute/display derived Master Data counts from already-fetched state; if needed data isn’t present, trigger existing lightweight Master Data reads in this file and then compute counts; Refresh updates both backend summary and derived counts without page reload.

**User-visible outcome:** Master Data Save/Update/Delete actions no longer create duplicates or double-trigger, archived items can be optionally shown with clear status badges, and the Ringkasan tab consistently shows non-empty summary information and stays updated after Master Data changes.
