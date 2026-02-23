"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusActions({
  feedbackId,
  currentStatus,
}: {
  feedbackId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    try {
      await fetch(`/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const actions = [
    { status: "new", label: "Mark New", style: "border-blue-200 text-blue-700 hover:bg-blue-50" },
    { status: "reviewed", label: "Mark Reviewed", style: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
    { status: "archived", label: "Archive", style: "border-gray-200 text-gray-600 hover:bg-gray-50" },
  ].filter((a) => a.status !== currentStatus);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
        Actions
      </h3>
      <div className="flex items-center gap-3">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => updateStatus(action.status)}
            disabled={loading !== null}
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${action.style}`}
          >
            {loading === action.status ? "Updating..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
