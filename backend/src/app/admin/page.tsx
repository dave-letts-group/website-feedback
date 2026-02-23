import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    reviewed: "bg-emerald-100 text-emerald-700",
    archived: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.new}`}
    >
      {status}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    bug: "bg-red-100 text-red-700",
    feature: "bg-purple-100 text-purple-700",
    general: "bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[category] || styles.general}`}
    >
      {category}
    </span>
  );
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-300 text-sm">—</span>;
  return (
    <span className="text-amber-400 text-sm tracking-wide">
      {"★".repeat(rating)}
      {"☆".repeat(5 - rating)}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const tid = session.tenantId;

  const cookieStore = await cookies();
  const currentSiteId = cookieStore.get("current-site-id")?.value || null;

  const where = currentSiteId ? { siteId: currentSiteId } : { tenantId: tid };

  let siteName: string | null = null;
  if (currentSiteId) {
    const site = await prisma.site.findFirst({
      where: { id: currentSiteId, tenantId: tid },
      select: { name: true },
    });
    siteName = site?.name ?? null;
  }

  const [total, newCount, reviewedCount, archivedCount, bugCount, featureCount, recent] =
    await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.count({ where: { ...where, status: "new" } }),
      prisma.feedback.count({ where: { ...where, status: "reviewed" } }),
      prisma.feedback.count({ where: { ...where, status: "archived" } }),
      prisma.feedback.count({ where: { ...where, category: "bug" } }),
      prisma.feedback.count({ where: { ...where, category: "feature" } }),
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          message: true,
          category: true,
          status: true,
          rating: true,
          userName: true,
          pageTitle: true,
          createdAt: true,
        },
      }),
    ]);

  const stats = [
    { label: "Total", value: total, color: "bg-indigo-500", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "New", value: newCount, color: "bg-blue-500", icon: "M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" },
    { label: "Reviewed", value: reviewedCount, color: "bg-emerald-500", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Bugs", value: bugCount, color: "bg-red-500", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Features", value: featureCount, color: "bg-purple-500", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { label: "Archived", value: archivedCount, color: "bg-gray-500", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard{siteName ? ` — ${siteName}` : ""}
        </h1>
        <p className="text-gray-500 mt-1">Overview of your feedback</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center mb-3`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Feedback</h2>
          <Link href="/admin/feedback" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all &rarr;
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No feedback yet. Add the widget to your site to start collecting feedback.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Message</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Rating</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/admin/feedback/${item.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                      {item.userName || "Anonymous"}
                    </Link>
                    {item.pageTitle && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">{item.pageTitle}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[300px] truncate">{item.message}</td>
                  <td className="px-6 py-4"><CategoryBadge category={item.category} /></td>
                  <td className="px-6 py-4"><Stars rating={item.rating} /></td>
                  <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
