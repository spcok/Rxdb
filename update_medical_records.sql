-- Add new columns to the medical_logs table for the EMR update

ALTER TABLE medical_logs
ADD COLUMN IF NOT EXISTS diagnosis TEXT,
ADD COLUMN IF NOT EXISTS bcs NUMERIC, -- Body Condition Score (1.0 - 5.0)
ADD COLUMN IF NOT EXISTS weight_grams NUMERIC, -- Weight in grams
ADD COLUMN IF NOT EXISTS treatment_plan TEXT;

-- Optional: Add comments to the columns for clarity
COMMENT ON COLUMN medical_logs.diagnosis IS 'Primary diagnosis or issue identified';
COMMENT ON COLUMN medical_logs.bcs IS 'Body Condition Score (1-5 scale)';
COMMENT ON COLUMN medical_logs.weight_grams IS 'Weight of the animal in grams at the time of the note';
COMMENT ON COLUMN medical_logs.treatment_plan IS 'Detailed treatment plan, medications, or procedures';
