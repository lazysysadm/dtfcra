// Signup policy: the very first account can always be created; afterwards
// signup requires ALLOW_SIGNUP=true.
export function canSignUp(existingUserCount: number, allowSignup: boolean): boolean {
  return existingUserCount === 0 || allowSignup;
}
