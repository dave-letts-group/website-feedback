-- LettsGroup SSO: optional password for SSO-only admins, stable IdP subject
ALTER TABLE "Admin" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "Admin" ADD COLUMN "lettsSub" TEXT;
CREATE UNIQUE INDEX "Admin_lettsSub_key" ON "Admin"("lettsSub");
