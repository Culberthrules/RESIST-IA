-- Run in Supabase SQL editor if schema.sql was applied before this patch.

CREATE TABLE IF NOT EXISTS review_decisions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  ast_record_id   UUID NOT NULL REFERENCES ast_records(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES profiles(id),
  decision        TEXT NOT NULL CHECK (decision IN ('validated', 'excluded')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_decisions_lab ON review_decisions(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_review_decisions_ast ON review_decisions(ast_record_id);

ALTER TABLE review_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view review decisions in their laboratory" ON review_decisions;
CREATE POLICY "Users can view review decisions in their laboratory"
  ON review_decisions FOR SELECT
  USING (laboratory_id = get_user_laboratory_id());

DROP POLICY IF EXISTS "Users can insert review decisions in their laboratory" ON review_decisions;
CREATE POLICY "Users can insert review decisions in their laboratory"
  ON review_decisions FOR INSERT
  WITH CHECK (laboratory_id = get_user_laboratory_id());

CREATE OR REPLACE FUNCTION get_laboratory_id_by_code(lab_code TEXT)
RETURNS UUID AS $$
  SELECT id FROM laboratories
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(lab_code))
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_laboratory_id_by_code(TEXT) TO anon, authenticated;
