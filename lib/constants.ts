export const SESSION_COOKIE = "airtek_session";
export const ORG_COOKIE = "airtek_org";
export const DEMO_PASSWORD = "airtek123";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};
