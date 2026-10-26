import { adminCreds, authRequired } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin login — SnowFlakes" };

export default function AdminLoginPage() {
  const c = adminCreds();
  return <LoginForm demoHint={authRequired() && c.demo ? { user: c.user, password: c.password } : null} open={!authRequired()} />;
}
