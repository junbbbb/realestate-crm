import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Shell from "./shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("crm-auth")?.value;

  if (!token || !verifyToken(token)) {
    redirect("/login");
  }

  return <Shell>{children}</Shell>;
}
