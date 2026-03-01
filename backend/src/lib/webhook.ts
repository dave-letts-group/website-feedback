import { prisma } from "./db";

interface VerifyResult {
  valid: boolean;
  error?: string;
  status?: number;
}

export async function sendWebhook(
  webhookUrl: string,
  webhookToken: string,
  payload: unknown,
): Promise<{ ok: boolean; status: number; body: string }> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${webhookToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

export async function verifyWebhookCredentials(
  webhookUrl: string,
  webhookToken: string,
): Promise<VerifyResult> {
  if (!webhookUrl.trim()) {
    return { valid: false, error: "Webhook URL is required" };
  }
  if (!webhookToken.trim()) {
    return { valid: false, error: "Webhook bearer token is required" };
  }

  try {
    const parsed = new URL(webhookUrl);
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !isLocalhost) {
      return {
        valid: false,
        error: "Webhook URL must use https:// (http://localhost is allowed for development)",
      };
    }
  } catch {
    return { valid: false, error: "Webhook URL is invalid" };
  }

  try {
    const verificationPayload = {
      id: "webhook_verification",
      message: "This is a webhook verification event from WebFeedback.",
      category: "general",
      pageTitle: "Webhook Verification",
      pageUrl: null,
      pageId: null,
      userId: null,
      userName: null,
      rating: null,
      status: "verification",
      screenshot: null,
      metadata: {
        verification: true,
        source: "web-feedback",
      },
      createdAt: new Date().toISOString(),
    };

    const result = await sendWebhook(webhookUrl, webhookToken, verificationPayload);
    if (!result.ok) {
      const detail = result.body ? `: ${result.body.slice(0, 300)}` : "";
      return {
        valid: false,
        error: `Webhook responded with ${result.status}${detail}`,
        status: result.status,
      };
    }

    return { valid: true, status: result.status };
  } catch (error) {
    return {
      valid: false,
      error: `Connection failed: ${(error as Error).message}`,
    };
  }
}

export async function syncFeedbackToWebhook(
  siteId: string,
  feedbackId: string,
  feedback: unknown,
) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { webhookUrl: true, webhookToken: true },
    });

    if (!site?.webhookUrl || !site?.webhookToken) return;

    const result = await sendWebhook(site.webhookUrl, site.webhookToken, feedback);
    if (!result.ok) {
      console.error(
        `Webhook delivery failed for feedback ${feedbackId}: HTTP ${result.status} ${result.body.slice(0, 300)}`,
      );
    }
  } catch (error) {
    console.error(`Webhook delivery failed for feedback ${feedbackId}:`, error);
  }
}
