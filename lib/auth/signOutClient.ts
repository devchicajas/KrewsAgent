/** Clear session + demo cookie, then redirect to login */
export async function signOutAndRedirect(
  redirectTo = "/login?tab=signin"
): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
  window.location.href = redirectTo;
}
