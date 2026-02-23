import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Sidebar from "./components/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    console.error("AdminLayout getSession error:", err);
  }

  if (!session) {
    return <>{children}</>;
  }

  const [admin, tenant, sites] = await Promise.all([
    prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { name: true, email: true, role: true, isSuperAdmin: true, tenantId: true },
    }),
    prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true },
    }),
    prisma.site.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const isImpersonating = admin?.isSuperAdmin === true && admin.tenantId !== session.tenantId;
  let homeTenantName: string | undefined;
  if (isImpersonating) {
    const homeTenant = await prisma.tenant.findUnique({
      where: { id: admin.tenantId },
      select: { name: true },
    });
    homeTenantName = homeTenant?.name ?? undefined;
  }

  const cookieStore = await cookies();
  const cookieSiteId = cookieStore.get("current-site-id")?.value ?? null;
  const validSiteId = sites.some((s) => s.id === cookieSiteId) ? cookieSiteId : (sites[0]?.id ?? null);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        adminName={admin?.name || admin?.email || "Admin"}
        tenantName={tenant?.name || ""}
        role={admin?.role || "member"}
        isSuperAdmin={session.isSuperAdmin}
        isImpersonating={isImpersonating}
        homeTenantName={homeTenantName}
        sites={sites}
        currentSiteId={validSiteId}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
