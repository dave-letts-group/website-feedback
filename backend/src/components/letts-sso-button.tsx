"use client";

export function LettsSsoButton({
  intent,
  inviteToken,
  variant = "dark",
}: {
  intent: "login" | "setup" | "invite";
  inviteToken?: string;
  variant?: "dark" | "light";
}) {
  if (process.env.NEXT_PUBLIC_LETTS_SSO_ENABLED !== "true") {
    return null;
  }

  const qs = new URLSearchParams({ intent });
  if (inviteToken) qs.set("token", inviteToken);
  const href = `/api/auth/letts/start?${qs.toString()}`;

  const light =
    variant === "light"
      ? "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
      : "border border-white/20 bg-white/10 text-white hover:bg-white/15";

  return (
    <a
      href={href}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${light}`}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">
        L
      </span>
      Continue with LettsGroup
    </a>
  );
}

export function LettsSsoDivider({ variant = "dark" }: { variant?: "dark" | "light" }) {
  if (process.env.NEXT_PUBLIC_LETTS_SSO_ENABLED !== "true") {
    return null;
  }
  const line =
    variant === "light" ? "border-gray-200" : "border-white/15";
  const text =
    variant === "light" ? "text-gray-400" : "text-slate-400";
  return (
    <div className={`relative my-5 flex items-center gap-3 border-t ${line} pt-5`}>
      <span
        className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 px-2 text-xs uppercase tracking-wide ${text} ${variant === "light" ? "bg-white" : "bg-slate-900"}`}
      >
        or
      </span>
    </div>
  );
}
