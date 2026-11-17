// How long data is kept. Payments are financial records; everything else is removed on request or after this window.
export const PAYMENT_RETENTION_YEARS = 7;
export const OTHER_DATA_RETENTION_DAYS = 60;

// Bump when the privacy notice changes in a way users must re-accept; stored with each patient's consent.
export const PRIVACY_POLICY_VERSION = '2026-11-17';
