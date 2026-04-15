import { cookies } from "next/headers";

export async function requireAdminSession() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;

  return Boolean(sessionSecret && adminSession === sessionSecret);
}
