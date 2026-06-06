import { redirect } from "next/navigation";

/** Create account tab on /login */
export default function SignUpPage() {
  redirect("/login?tab=signup");
}
