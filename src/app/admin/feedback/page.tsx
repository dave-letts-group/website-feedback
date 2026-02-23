"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface FeedbackItem {
  id: string;
  pageTitle: string | null;
  pageUrl: string | null;
  userId: string | null;
  userName: string | null;
  message: string;
  category: string;
  rating: number | null;
  status: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    reviewed: "bg-emerald-100 text-emerald-700",
    archived: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.new}`}>
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
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[category] || styles.general}`}>
      {category}
    </span>
  );
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-300 text-sm">—</span>;
  return (
    <span className="text-amber-400 text-sm tracking-wide">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export default function FeedbackListPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const limit = 20;

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    if (search) params.set("search", search);

    const siteId = document.cookie
      .split("; ")
      .find((c) => c.startsWith("current-site-id="))
      ?.split("=")[1];
    if (siteId) params.set("siteId", siteId);

    const res = await fetch(`/api/feedback?${params}`);
    const data = await res.json();
    setFeedback(data.feedback);
    setTotal(data.total);
    setLoading(false);
  }, [page, status, category, search]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    setPage(1);
  }, [status, category, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-gray-500 mt-1">All feedback from your users</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search messages, pages, users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Categories</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="general">General</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            <p className="mt-3">Loading...</p>
          </div>
        ) : feedback.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No feedback found</div>
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
              {feedback.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/admin/feedback/${item.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                      {item.userName || "Anonymous"}
                    </Link>
                    {item.pageTitle && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">{item.pageTitle}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/feedback/${item.id}`} className="text-sm text-gray-600 hover:text-gray-900 block max-w-[300px] truncate">
                      {item.message}
                    </Link>
                  </td>
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

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
