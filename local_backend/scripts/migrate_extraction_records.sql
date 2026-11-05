-- One-time migration: bring the pre-existing extraction_records table
-- (from an earlier build of this project) up to the schema the current
-- app expects. Purely additive/widening — no data is deleted.

BEGIN;

-- id: was UUID with a gen_random_uuid() default; the app supplies its own
-- str(uuid.uuid4()) id, so it needs to be TEXT with no default.
ALTER TABLE extraction_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE extraction_records ALTER COLUMN id TYPE TEXT USING id::text;

-- direction: manual-entry rows have direction = NULL, so it can't be NOT NULL.
ALTER TABLE extraction_records ALTER COLUMN direction DROP NOT NULL;

-- extracted_data: the app writes/reads this as a JSON *string* (json.dumps /
-- json.loads in Python), not native jsonb — store it as text to match.
ALTER TABLE extraction_records ALTER COLUMN extracted_data TYPE TEXT USING extracted_data::text;

-- Missing columns the current app relies on.
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'automatic';
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS manual_fields TEXT;
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS challan_image_url TEXT;
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS vehicle_front_url TEXT;
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS vehicle_back_url TEXT;
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS return_status TEXT;
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE extraction_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

COMMIT;

-- Verify:
\d extraction_records
