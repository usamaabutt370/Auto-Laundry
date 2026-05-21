export const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
export const SESSION_COOKIE = "admin_session";
// Set ADMIN_SESSION_SECRET in Vercel env vars for production
export const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ?? "auto-laundry-admin-dev-secret-change-in-prod";
