import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_ADDRESS = "WebFeedback <notifcations@pawafx.pawapay.co.uk>";

interface InviteEmailParams {
  to: string;
  inviteUrl: string;
  inviterName: string;
  teamName: string;
  role: string;
}

interface FeedbackReceivedEmailParams {
  to: string[];
  siteName: string;
  category: string;
  message: string;
  userName: string | null;
  pageUrl: string | null;
  feedbackUrl: string;
}

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="font-size:18px;font-weight:700;color:#18181b;letter-spacing:-0.02em;">WebFeedback</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.5;">
                This email was sent by WebFeedback. If you didn't expect this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function inviteHtml({ inviterName, teamName, role, inviteUrl }: Omit<InviteEmailParams, "to">): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">You're invited to join a team</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
      <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${role}</strong>.
    </p>
    <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
      Accept Invite
    </a>
    <p style="margin:20px 0 0;font-size:13px;color:#71717a;line-height:1.5;">
      This invite expires in 7 days. If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin:4px 0 0;font-size:13px;color:#3b82f6;word-break:break-all;">${inviteUrl}</p>
  `);
}

function feedbackReceivedHtml({
  siteName,
  category,
  message,
  userName,
  pageUrl,
  feedbackUrl,
}: Omit<FeedbackReceivedEmailParams, "to">): string {
  const categoryBadge: Record<string, string> = {
    bug: "background:#fef2f2;color:#dc2626;",
    feature: "background:#eff6ff;color:#2563eb;",
    general: "background:#f4f4f5;color:#52525b;",
  };
  const badgeStyle = categoryBadge[category] || categoryBadge.general;

  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">New feedback received</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      A new <span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;${badgeStyle}">${category}</span> was submitted on <strong>${siteName}</strong>.
    </p>
    <div style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
      <p style="margin:0;font-size:14px;color:#18181b;line-height:1.6;">${message.length > 500 ? message.slice(0, 497) + "..." : message}</p>
    </div>
    <table style="margin-bottom:20px;font-size:13px;color:#52525b;line-height:1.6;">
      ${userName ? `<tr><td style="padding:2px 12px 2px 0;font-weight:600;">From</td><td>${userName}</td></tr>` : ""}
      ${pageUrl ? `<tr><td style="padding:2px 12px 2px 0;font-weight:600;">Page</td><td style="word-break:break-all;">${pageUrl}</td></tr>` : ""}
    </table>
    <a href="${feedbackUrl}" style="display:inline-block;padding:12px 28px;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
      View in Dashboard
    </a>
  `);
}

export async function sendInviteEmail(params: InviteEmailParams) {
  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `You've been invited to join ${params.teamName}`,
      html: inviteHtml(params),
    });

    if (error) {
      console.error("Failed to send invite email:", error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("Invite email error:", error);
    return null;
  }
}

export async function sendFeedbackReceivedEmail(params: FeedbackReceivedEmailParams) {
  if (params.to.length === 0) return null;

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `New ${params.category} feedback on ${params.siteName}`,
      html: feedbackReceivedHtml(params),
    });

    if (error) {
      console.error("Failed to send feedback notification email:", error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("Feedback notification email error:", error);
    return null;
  }
}
