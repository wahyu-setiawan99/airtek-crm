export const SESSION_COOKIE = "airtek_session";
export const ORG_COOKIE = "airtek_org";
/** Not proof of login. The home page only uses it to label the button. */
export const SIGNED_IN_COOKIE = "airtek_signed_in";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const DEMO_PASSWORD = "airtek123";

const sharedCookie = {
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export const cookieOptions = {
  ...sharedCookie,
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 30,
};

/** Readable from `document.cookie` on the static home page. */
export const signedInCookieOptions = {
  ...sharedCookie,
  httpOnly: false,
  maxAge: cookieOptions.maxAge,
};

export const localeCookieOptions = {
  ...sharedCookie,
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 365,
};
