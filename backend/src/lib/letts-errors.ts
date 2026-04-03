/** User-facing copy for `letts_error` query params from OAuth callback. */

export function loginLettsErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const m: Record<string, string> = {
    no_account:
      "No WebFeedback account exists for this LettsGroup user. Create an account on the setup page, or ask your team for an invite.",
    account_conflict:
      "This email is already linked to a different LettsGroup identity.",
    no_email: "LettsGroup did not return an email for this account.",
    invalid_state: "Sign-in session expired. Please try LettsGroup again.",
    missing_code: "LettsGroup sign-in was interrupted. Please try again.",
    token_exchange: "Could not complete LettsGroup sign-in. Please try again.",
    userinfo: "Could not load your LettsGroup profile. Please try again.",
    config: "LettsGroup SSO is not configured correctly on this server.",
    invite_missing: "Invalid team invite flow. Open your invite link again.",
  };
  return m[code] ?? `LettsGroup sign-in did not complete (${code}).`;
}

export function inviteLettsErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const m: Record<string, string> = {
    email_mismatch:
      "Signed-in LettsGroup email does not match this invite. Use the Letts account for the invited email.",
    invalid_invite: "This invite is invalid or has expired.",
    exists: "An account with this email already exists. Sign in instead.",
  };
  return m[code] ?? `LettsGroup sign-in did not complete (${code}).`;
}
