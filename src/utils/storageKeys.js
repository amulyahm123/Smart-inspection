// localStorage keys used by the prototype
export const DATA_KEY = 'sih_demo_data_v2' // submitted inspections, issues, alerts, notifications
export const DRAFT_KEY = 'sih_demo_draft_v1' // the inspection currently being filled in
export const SITES_KEY = 'sih_sites_v1' // admin-registered sites + admin edits to the starting sites
export const SITE_FILES_KEY = 'sih_site_files_v1' // photos / documents attached to sites (kept apart so a full browser store can never break the main data)
export const RISK_KEY = 'sih_risk_v1' // risk scores, score history, alert acknowledgements, risk settings
export const GPS_LOG_KEY = 'sih_gps_log_v1' // failed GPS verification attempts (outside the site radius)
