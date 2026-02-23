"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  tenantCount: number;
  siteCount: number;
  adminCount: number;
  feedbackCount: number;
}

interface RecentFeedback {
  id: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
  site: { name: string };
  tenantName: string;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecentFeedback(data.recentFeedback || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Super Admin</h1>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          <p className="mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Tenants", value: stats?.tenantCount ?? 0, color: "bg-indigo-500" },
    { label: "Sites", value: stats?.siteCount ?? 0, color: "bg-emerald-500" },
    { label: "Users", value: stats?.adminCount ?? 0, color: "bg-amber-500" },
    { label: "Feedback", value: stats?.feedbackCount ?? 0, color: "bg-rose-500" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
          <p className="text-gray-500 mt-1">Platform-wide overview across all tenants</p>
        </div>
        <Link
          href="/admin/superadmin/tenants"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Manage Tenants
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-white font-bold text-sm">{card.value}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {recentFeedback.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Feedback (All Tenants)</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-3 font-medium">Tenant</th>
                <th className="px-6 py-3 font-medium">Site</th>
                <th className="px-6 py-3 font-medium">Message</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentFeedback.map((fb) => (
                <tr key={fb.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{fb.tenantName}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{fb.site.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{fb.message}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {fb.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
