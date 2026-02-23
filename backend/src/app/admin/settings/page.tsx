import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const cookieStore = await cookies();
  const currentSiteId = cookieStore.get("current-site-id")?.value || null;

  if (currentSiteId) {
    redirect(`/admin/sites/${currentSiteId}`);
  } else {
    redirect("/admin/sites");
  }
}
