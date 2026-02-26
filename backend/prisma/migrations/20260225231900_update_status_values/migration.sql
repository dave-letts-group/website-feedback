-- UpdateStatusValues: migrate old status values to new ones
-- Old: "new", "reviewed", "archived"
-- New: "New", "Pending", "In Progress", "Closed"

-- Only runs if the Feedback table exists (safe for fresh deployments)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Feedback') THEN
    UPDATE "Feedback" SET status = 'New' WHERE status = 'new';
    UPDATE "Feedback" SET status = 'Closed' WHERE status = 'reviewed';
    UPDATE "Feedback" SET status = 'Closed' WHERE status = 'archived';
  END IF;
END $$;

-- Update the default value for the status column
ALTER TABLE IF EXISTS "Feedback" ALTER COLUMN "status" SET DEFAULT 'New';
