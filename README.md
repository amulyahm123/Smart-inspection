# Smart Inspection – Phase 1

React + Vite prototype (login, role dashboards, navigation, mock data).

## Run
    npm install
    npm run dev

Open the URL shown (usually http://localhost:5173). Pick Inspector or Admin on the login page.

## Where things live
- `src/data/`      mock data (replace with Firebase later)
- `src/services/`  the only layer that reads data — swap these functions for real calls
- `src/components/layout/navConfig.js`  add a nav item here + a `<Route>` in `App.jsx`
- `src/styles/global.css`  design tokens (colours, radius) at the top

## Phase 2 – Old Sites flow
Home → Old Sites → Site Details → GPS check-in → Checklist → Evidence → Issues → Summary → Submit → GPS check-out → Completed

- `src/context/InspectionContext.jsx`  the inspection currently being filled in (in memory – a page refresh resets it)
- `src/components/inspection/`         one component per step
- `src/data/checklists.js`             checklist categories/items (edit here to change the checklist)
- `src/services/gpsService.js`         demo + real GPS, distance check
- `src/services/dataService.js`        `submitInspection` / `completeInspection` save into the in-memory mock data
Demo GPS tip: choose "Away from site" to show a failed check-in, then switch back to "At the site".

## Phase 3 – New Sites (construction) flow
Home → New Sites → Project Details → GPS check-in → Progress (phase + observed %) → Phase checklist → Material check → Evidence → Issues → Summary → Submit → GPS check-out → Completed

- `src/data/constructionChecklists.js`  work + material items per phase (edit here)
- `src/utils/construction.js`           Progress / Quality / Issues indicators and overall status
- `src/components/inspection/`          `ProgressStep`, `PhaseItemsStep`, `ConstructionSummaryStep` (other steps are shared with Old Sites)
- Progress status: difference ≥ 0 On Track · −1…−4 Attention Required · ≤ −5 Delayed (`src/utils/status.js`)

## Phase 4 – CCTV feed (simulated)
Home → CCTV Feed – Active (also under Admin → CCTV)

- `src/components/cctv/SimFeed.jsx`   draws the fake camera picture (SVG, no video). Same camera id = same scene
- `src/data/cameras.js`               cameras (id, site, name, location, live/offline)
- `src/data/cameraAlertTypes.js`      detections the "Simulate alert" button can raise
- A camera is "in alert" while an open alert in the alerts list has its camera id. `triggerCameraAlert()` in `dataService.js` adds that alert, so it appears in Alerts, notifications and the Home counts
- Demo: open CCTV → "Simulate alert", or open a camera → pick a detection → "Trigger alert". Alerts page rows link back to the camera

## Phase 5 – Ongoing / Pending Alerts (central feed)
Home → Ongoing / Pending Alerts (Inspector) · Admin → Alerts

- `src/services/alertService.js`  builds ONE alert list, live, from: issues (critical / recurring / other), delayed construction projects, missed + pending inspections, CCTV events. Nothing is stored twice, so resolving an issue or completing an inspection updates the alerts automatically
- `src/data/alerts.js`            now holds CCTV events only
- Filters: severity, type (chips), site/project, inspector, status (+ sort, + "My alerts" for inspectors)
- Issue lifecycle: Reported → Verified → Assigned → In Progress → Resolved → Closed. Admin changes it in the alert details or on Admin → Issues (`updateIssueStatus` in `dataService.js`); the reporting inspector gets a notification
- Recurring: the same problem (same site + category + shared keyword) reported 2+ times. 2× → "Escalate to Supervisor", 3×+ → "Escalate to Department Head" while unresolved (`refreshRecurrence` in `dataService.js`)

## Phase 6 – Admin management
Admin nav: Dashboard · Officers · Sites/Projects · Inspections · Issues · CCTV · Alerts · Attendance · Reports

- `src/services/adminService.js`      all admin numbers (officer stats, attendance, site rows, report data). Swap for backend calls later – pages don't change
- `src/services/assignmentService.js` random inspection assignment (uses `crypto.getRandomValues`)
- Attendance is calculated, never typed: Present = a day with an inspection that has a GPS check-in AND check-out; Absent = scheduled but no GPS check-in; Incomplete = checked in, no check-out. Seeded inspections get mock GPS records in `dataService.js` (`seedGps`)
- Inspection groups: Upcoming (future date) · Pending (due today / overdue / in progress) · Completed · Missed (`inspectionBucket` in `dataService.js`)
- Detail pages: `/admin/officers/:id` and `/admin/sites/:id`
- Charts are plain SVG/CSS in `src/components/charts/` (no chart library to install)

## Phase 7 – Random inspection assignment engine
Admin → Assignments (`/admin/assignments`)

- `src/services/assignmentService.js`  `generateAssignment()` lists every valid inspector + site + start time, then picks one at random (crypto). Rules: no overlapping visits for an inspector, no site double-booked at the same time, optional "skip the site's regular officer"
- Inputs: available inspectors, available sites/projects, date, time range, inspection length
- Status: Assigned (later day) · Upcoming (due today) · Completed · Missed – worked out by `assignmentStatus()`
- History = every inspection created by the engine (`random: true`); future ones can be cancelled

## Saving data (important)
Everything you do (submitted inspections, issues, alert / issue status changes, notifications, an unfinished inspection) is saved in the browser's localStorage, so a **page refresh keeps it**. It is per browser, not shared between devices. If days pass, relative dates shift forward automatically. Use **Reset demo data** (sidebar, mobile "More" menu, or the login page) to go back to the starting data.
- `src/services/dataService.js` -> `persist()` / `restore()` / `resetDemoData()` (replace these when you add a real backend)
- `src/context/InspectionContext.jsx` saves the unfinished inspection

## Final integration – Notifications + everything connected
- `src/services/notificationService.js`  the notification centre. STORED events: new assignment, issue status update, issue resolved, CCTV alert. DERIVED live from the data: upcoming inspection, missed inspection, delayed project, critical issue, recurring issue, and "new issue assigned" for the responsible team
- Every notification has a `link` (`linkFor()`): inspection, issue (opens the alert details), project, or camera. Opening one marks it read; "Mark all as read" is on the page
- Admin now has a Notifications page (with a Team notices filter) and the bell icon goes there
- Deep links: `/…/alerts?alert=ISSUE-ISS-502` opens that alert, `/…/cctv?camera=CAM-01` opens that camera, `/admin/inspections?q=INSP-3011` pre-fills the search
- Admin dashboard cards open the matching page; "Recent activity" is built from real records (`getRecentActivity` in `adminService.js`)
- Data saved in the browser is now `sih_demo_data_v2` (older saves are ignored and the app starts fresh once)

### Flow that was tested end-to-end
Login → role guard → Home → Old Sites → New Sites → CCTV → Alerts → (Admin) Officers → Sites/Projects → Inspections → Assignments → Issues → Attendance → Reports → Notifications. An automated crawl opened every page for both roles and checked every link; a workflow test checked that one inspection submission updates the dashboards, alerts, officer profile, site history, reports and notifications.

## Site management (Admin → Sites / Projects)
Add, edit, assign, change status, archive and delete sites. Old (existing) and new (project) sites share one form.

- `src/pages/admin/Sites.jsx`            list: stat cards, search, filters (type, department, officer, district, status), sorting, table + mobile cards
- `src/pages/admin/SiteDetail.jsx`       details: info, location, officer, progress, inspections, issues, photos/PDFs, edit / status / officer / archive / delete
- `src/components/sites/`                `SiteFormModal` (add + edit), `QuickModals` (status, officer), `Dialog` (confirm dialogs)
- `src/services/siteService.js`          validation, unique IDs (S-109, P-206 …, never reused), admin-only rules, archive/delete protection, file handling
- `src/services/dataService.js`          storage: `registerSite` / `patchSite` / `removeSite` (replace with API calls when a backend exists)
- Saved in the browser: `sih_sites_v1` (sites + edits) and `sih_site_files_v1` (photos/PDFs). **Reset demo data** clears them too
- Sites with inspections, issues, cameras or alerts cannot be deleted, only archived. Archived sites disappear from inspector lists, assignments and alerts but their history stays

## Smart risk score
Rule-based 0–100 score per site (Low / Medium / High) shown on the Admin Dashboard, Sites list, Site details and Reports, with reasons, data
confidence, history/trend chart and risk alerts. Full formula and weights: `docs/RISK_SCORING.md`.

- `src/services/risk/riskEngine.js` / `riskConfig.js`  pure calculation + configurable weights (testable in plain Node)
- `src/services/riskService.js`                         saves scores + history, listens for data changes, builds alerts, Admin actions
- `src/components/risk/`                                gauge, bar, trend chart, site panel, High-risk sites list, settings dialog
- Saved in the browser: `sih_risk_v1` (scores, history, acknowledgements, settings), `sih_gps_log_v1` (failed GPS attempts)
- Tests: `npm run test:risk`
#   S m a r t - i n s p e c t i o n  
 #   S m a r t - i n s p e c t i o n  
 