import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import StatusActions from "./status-actions";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const feedback = await prisma.feedback.findFirst({
    where: { id, tenantId: session.tenantId },
    include: { site: { select: { name: true } } },
  });

  if (!feedback) notFound();

  const statusStyles: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    reviewed: "bg-emerald-100 text-emerald-700",
    archived: "bg-gray-100 text-gray-600",
  };

  const categoryStyles: Record<string, string> = {
    bug: "bg-red-100 text-red-700",
    feature: "bg-purple-100 text-purple-700",
    general: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href="/admin/feedback"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Feedback
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Detail</h1>
          <p className="text-gray-400 text-sm mt-1">
            Submitted {new Date(feedback.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[feedback.status] || statusStyles.new}`}>
          {feedback.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryStyles[feedback.category] || categoryStyles.general}`}>
                {feedback.category}
              </span>
              {feedback.rating && (
                <span className="text-amber-400 text-sm">
                  {"★".repeat(feedback.rating)}{"☆".repeat(5 - feedback.rating)}
                </span>
              )}
            </div>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{feedback.message}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Page Context</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                ["Site", feedback.site?.name],
                ["Source Domain", feedback.sourceDomain],
                ["Page Title", feedback.pageTitle],
                ["Page URL", feedback.pageUrl],
                ["Page ID", feedback.pageId],
                ["User ID", feedback.userId],
                ["User Name", feedback.userName],
                ["User Agent", feedback.userAgent],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-gray-400 font-medium">{label}</dt>
                  <dd className="text-gray-800 mt-0.5 break-all">{(value as string) || "—"}</dd>
                </div>
              ))}
            </dl>

            {feedback.urlParams && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-sm text-gray-400 font-medium mb-1">URL Parameters</dt>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                  {JSON.stringify(feedback.urlParams, null, 2)}
                </pre>
              </div>
            )}

            {feedback.metadata && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <dt className="text-sm text-gray-400 font-medium mb-1">Custom Metadata</dt>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                  {JSON.stringify(feedback.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {(feedback.notionPageId || feedback.githubIssueUrl) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                Integrations
              </h3>
              <div className="space-y-3 text-sm">
                {feedback.githubIssueUrl && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <a
                      href={feedback.githubIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 font-medium truncate"
                    >
                      View GitHub Issue
                    </a>
                  </div>
                )}
                {feedback.notionPageId && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.03 2.205c-.467-.373-.84-.187-1.96-.093L3.2 2.952c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.84c-.56.047-.747.327-.747.98zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.933-.234-1.494-.934l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.187c-.093-.186 0-.653.327-.746l.84-.233V8.756l-1.168-.093c-.093-.42.14-1.026.793-1.073l3.456-.234 4.764 7.28V8.57l-1.215-.14c-.093-.514.28-.886.747-.933zM2.723 1.355l13.308-.84c1.635-.14 2.055-.047 3.082.7l4.25 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.046-1.448-.094-1.962-.747L1.15 18.473c-.56-.747-.793-1.306-.793-1.96V2.895c0-.84.373-1.494 1.307-1.587z"/>
                    </svg>
                    <span className="text-gray-600 font-mono text-xs truncate">
                      Notion: {feedback.notionPageId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <StatusActions feedbackId={feedback.id} currentStatus={feedback.status} />
        </div>

        <div className="space-y-6">
          {feedback.screenshot ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Screenshot</h3>
              <a href={feedback.screenshot} target="_blank" rel="noopener noreferrer">
                <img
                  src={feedback.screenshot}
                  alt="Page screenshot"
                  className="w-full rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                />
              </a>
              <p className="text-xs text-gray-400 mt-2 text-center">Click to view full size</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">No screenshot captured</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
