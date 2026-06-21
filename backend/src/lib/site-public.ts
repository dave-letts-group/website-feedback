type AdminSiteRecord = {
  id: string;
  tenantId: string;
  name: string;
  domain: string | null;
  siteKey: string;
  notionApiKey: string | null;
  notionDbId: string | null;
  notionEnabled: boolean;
  githubToken: string | null;
  githubRepo: string | null;
  githubEnabled: boolean;
  webhookUrl: string | null;
  webhookToken: string | null;
  webhookEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const adminSiteSelect = {
  id: true,
  tenantId: true,
  name: true,
  domain: true,
  siteKey: true,
  notionApiKey: true,
  notionDbId: true,
  notionEnabled: true,
  githubToken: true,
  githubRepo: true,
  githubEnabled: true,
  webhookUrl: true,
  webhookToken: true,
  webhookEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

function hasStoredSecret(value: string | null): boolean {
  return Boolean(value && value !== "null");
}

export function toAdminSitePayload(site: AdminSiteRecord) {
  return {
    id: site.id,
    name: site.name,
    domain: site.domain,
    siteKey: site.siteKey,
    hasNotionApiKey: hasStoredSecret(site.notionApiKey),
    notionDbId: site.notionDbId,
    notionEnabled: site.notionEnabled,
    hasGithubToken: hasStoredSecret(site.githubToken),
    githubRepo: site.githubRepo,
    githubEnabled: site.githubEnabled,
    webhookUrl: site.webhookUrl,
    hasWebhookToken: hasStoredSecret(site.webhookToken),
    webhookEnabled: site.webhookEnabled,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}
