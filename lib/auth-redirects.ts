// Where a member lands once they're signed in. The home page, not the
// dashboard: signing in is how you start using the app, and the home screen is
// the one with the balance, the quick actions and the deals on it. The
// dashboard is somewhere you go on purpose.
//
// Kept in one place because the landing page is reached from six directions —
// password login, PIN login, Google, OTP signup, PIN reset, and the two gate
// screens' `next` fallback — and they have drifted apart before.
export const POST_LOGIN_PATH = "/";

// Pre-encoded for building `/verify-pin?next=…` links.
export const POST_LOGIN_PATH_ENCODED = encodeURIComponent(POST_LOGIN_PATH);

// Staff land in the admin area instead; their own login never touches
// POST_LOGIN_PATH. See adminLoginAction.
export const POST_LOGIN_PATH_STAFF = "/admin";
