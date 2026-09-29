-- ============================================================
-- RESIST-IA Database Schema
-- Antimicrobial Resistance Surveillance Platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy text matching

-- ============================================================
-- 1. LABORATORIES
-- ============================================================
CREATE TABLE laboratories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  country     TEXT NOT NULL DEFAULT 'CM',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'reviewer', 'technician')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_lab ON profiles(laboratory_id);

-- ============================================================
-- 3. REFERENCE TABLES (canonical names)
-- ============================================================
CREATE TABLE reference_organisms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name  TEXT NOT NULL UNIQUE,
  aliases         TEXT[] NOT NULL DEFAULT '{}',
  gram_type       TEXT CHECK (gram_type IN ('positive', 'negative', 'other')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reference_antimicrobials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name  TEXT NOT NULL UNIQUE,
  aliases         TEXT[] NOT NULL DEFAULT '{}',
  class           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reference_specimens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name  TEXT NOT NULL UNIQUE,
  aliases         TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. UPLOADS
-- ============================================================
CREATE TABLE uploads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  file_name       TEXT NOT NULL,
  file_size       INTEGER NOT NULL,
  total_rows      INTEGER NOT NULL DEFAULT 0,
  valid_rows      INTEGER NOT NULL DEFAULT 0,
  error_rows      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uploads_lab ON uploads(laboratory_id);

-- ============================================================
-- 5. AST RECORDS
-- ============================================================
CREATE TABLE ast_records (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_id           UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  upload_id               UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  
  -- Raw values (as uploaded)
  raw_organism            TEXT,
  raw_antimicrobial       TEXT,
  raw_specimen            TEXT,
  raw_result              TEXT,
  
  -- Standardized values
  organism                TEXT,
  antimicrobial           TEXT,
  specimen                TEXT,
  result                  TEXT CHECK (result IN ('S', 'I', 'R', NULL)),
  
  -- Reference links
  organism_ref_id         UUID REFERENCES reference_organisms(id),
  antimicrobial_ref_id    UUID REFERENCES reference_antimicrobials(id),
  specimen_ref_id         UUID REFERENCES reference_specimens(id),
  
  -- Metadata
  sample_date             DATE,
  patient_age_group       TEXT,  -- e.g., 'adult', 'pediatric', 'neonate'
  ward                    TEXT,
  row_number              INTEGER NOT NULL,
  
  -- Review status
  review_status           TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'validated', 'excluded')),
  reviewed_by             UUID REFERENCES profiles(id),
  reviewed_at             TIMESTAMPTZ,
  
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ast_lab ON ast_records(laboratory_id);
CREATE INDEX idx_ast_upload ON ast_records(upload_id);
CREATE INDEX idx_ast_review ON ast_records(review_status);
CREATE INDEX idx_ast_organism ON ast_records(organism);
CREATE INDEX idx_ast_antimicrobial ON ast_records(antimicrobial);
CREATE INDEX idx_ast_date ON ast_records(sample_date);

-- ============================================================
-- 6. QUALITY ISSUES
-- ============================================================
CREATE TABLE quality_issues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  ast_record_id   UUID NOT NULL REFERENCES ast_records(id) ON DELETE CASCADE,
  upload_id       UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  issue_type      TEXT NOT NULL CHECK (issue_type IN (
    'missing_organism',
    'missing_antimicrobial', 
    'missing_specimen',
    'missing_result',
    'missing_date',
    'invalid_result',
    'possible_duplicate',
    'unknown_organism',
    'unknown_antimicrobial',
    'unknown_specimen'
  )),
  severity        TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('error', 'warning', 'info')),
  message         TEXT NOT NULL,
  field_name      TEXT,
  field_value     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qi_lab ON quality_issues(laboratory_id);
CREATE INDEX idx_qi_ast ON quality_issues(ast_record_id);
CREATE INDEX idx_qi_upload ON quality_issues(upload_id);

-- ============================================================
-- 6b. REVIEW DECISIONS (audit trail)
-- ============================================================
CREATE TABLE review_decisions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  ast_record_id   UUID NOT NULL REFERENCES ast_records(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES profiles(id),
  decision        TEXT NOT NULL CHECK (decision IN ('validated', 'excluded')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_decisions_lab ON review_decisions(laboratory_id);
CREATE INDEX idx_review_decisions_ast ON review_decisions(ast_record_id);

-- ============================================================
-- 7. ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: get current user's laboratory_id
CREATE OR REPLACE FUNCTION get_user_laboratory_id()
RETURNS UUID AS $$
  SELECT laboratory_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Signup: resolve laboratory id by code without exposing all laboratories
CREATE OR REPLACE FUNCTION get_laboratory_id_by_code(lab_code TEXT)
RETURNS UUID AS $$
  SELECT id FROM laboratories
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(lab_code))
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION get_laboratory_id_by_code(TEXT) TO anon, authenticated;

-- LABORATORIES
ALTER TABLE laboratories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own laboratory"
  ON laboratories FOR SELECT
  USING (id = get_user_laboratory_id());

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their laboratory"
  ON profiles FOR SELECT
  USING (laboratory_id = get_user_laboratory_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- UPLOADS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view uploads in their laboratory"
  ON uploads FOR SELECT
  USING (laboratory_id = get_user_laboratory_id());

CREATE POLICY "Users can insert uploads in their laboratory"
  ON uploads FOR INSERT
  WITH CHECK (laboratory_id = get_user_laboratory_id());

CREATE POLICY "Users can update uploads in their laboratory"
  ON uploads FOR UPDATE
  USING (laboratory_id = get_user_laboratory_id());

-- AST RECORDS
ALTER TABLE ast_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AST records in their laboratory"
  ON ast_records FOR SELECT
  USING (laboratory_id = get_user_laboratory_id());

CREATE POLICY "Users can insert AST records in their laboratory"
  ON ast_records FOR INSERT
  WITH CHECK (laboratory_id = get_user_laboratory_id());

CREATE POLICY "Users can update AST records in their laboratory"
  ON ast_records FOR UPDATE
  USING (laboratory_id = get_user_laboratory_id());

-- QUALITY ISSUES
ALTER TABLE quality_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quality issues in their laboratory"
  ON quality_issues FOR SELECT
  USING (laboratory_id = get_user_laboratory_id());

CREATE POLICY "Users can insert quality issues in their laboratory"
  ON quality_issues FOR INSERT
  WITH CHECK (laboratory_id = get_user_laboratory_id());

-- REVIEW DECISIONS
ALTER TABLE review_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view review decisions in their laboratory"
  ON review_decisions FOR SELECT
  USING (laboratory_id = get_user_laboratory_id());

CREATE POLICY "Users can insert review decisions in their laboratory"
  ON review_decisions FOR INSERT
  WITH CHECK (laboratory_id = get_user_laboratory_id());

-- REFERENCE TABLES (readable by all authenticated users)
ALTER TABLE reference_organisms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_antimicrobials ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_specimens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reference organisms"
  ON reference_organisms FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view reference antimicrobials"
  ON reference_antimicrobials FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view reference specimens"
  ON reference_specimens FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- 8. SEED REFERENCE DATA
-- ============================================================

-- Common organisms
INSERT INTO reference_organisms (canonical_name, aliases, gram_type) VALUES
  ('Escherichia coli', ARRAY['E. coli', 'E.coli', 'Ecoli', 'ESCHERICHIA COLI'], 'negative'),
  ('Klebsiella pneumoniae', ARRAY['K. pneumoniae', 'K.pneumoniae', 'KLEBSIELLA PNEUMONIAE'], 'negative'),
  ('Staphylococcus aureus', ARRAY['S. aureus', 'S.aureus', 'Staph aureus', 'STAPHYLOCOCCUS AUREUS', 'MRSA', 'MSSA'], 'positive'),
  ('Pseudomonas aeruginosa', ARRAY['P. aeruginosa', 'P.aeruginosa', 'PSEUDOMONAS AERUGINOSA'], 'negative'),
  ('Acinetobacter baumannii', ARRAY['A. baumannii', 'A.baumannii', 'ACINETOBACTER BAUMANNII'], 'negative'),
  ('Enterococcus faecalis', ARRAY['E. faecalis', 'E.faecalis', 'ENTEROCOCCUS FAECALIS'], 'positive'),
  ('Enterococcus faecium', ARRAY['E. faecium', 'E.faecium', 'ENTEROCOCCUS FAECIUM'], 'positive'),
  ('Proteus mirabilis', ARRAY['P. mirabilis', 'P.mirabilis', 'PROTEUS MIRABILIS'], 'negative'),
  ('Salmonella enterica', ARRAY['Salmonella', 'S. enterica', 'SALMONELLA', 'SALMONELLA ENTERICA'], 'negative'),
  ('Streptococcus pneumoniae', ARRAY['S. pneumoniae', 'S.pneumoniae', 'STREPTOCOCCUS PNEUMONIAE', 'Pneumococcus'], 'positive'),
  ('Candida albicans', ARRAY['C. albicans', 'C.albicans', 'CANDIDA ALBICANS'], 'other'),
  ('Neisseria gonorrhoeae', ARRAY['N. gonorrhoeae', 'N.gonorrhoeae', 'NEISSERIA GONORRHOEAE', 'Gonococcus'], 'negative'),
  ('Haemophilus influenzae', ARRAY['H. influenzae', 'H.influenzae', 'HAEMOPHILUS INFLUENZAE'], 'negative'),
  ('Enterobacter cloacae', ARRAY['E. cloacae', 'E.cloacae', 'ENTEROBACTER CLOACAE'], 'negative'),
  ('Serratia marcescens', ARRAY['S. marcescens', 'S.marcescens', 'SERRATIA MARCESCENS'], 'negative');

-- Common antimicrobials
INSERT INTO reference_antimicrobials (canonical_name, aliases, class) VALUES
  ('Amoxicillin', ARRAY['AMX', 'Amox', 'AMOXICILLIN', 'Amoxicilline'], 'Penicillins'),
  ('Amoxicillin-Clavulanate', ARRAY['AMC', 'Augmentin', 'AMOXICILLIN-CLAVULANATE', 'Amox-Clav', 'Co-amoxiclav'], 'Penicillins'),
  ('Ampicillin', ARRAY['AMP', 'AMPICILLIN', 'Ampicilline'], 'Penicillins'),
  ('Piperacillin-Tazobactam', ARRAY['TZP', 'Pip-Tazo', 'PIPERACILLIN-TAZOBACTAM', 'Tazocin'], 'Penicillins'),
  ('Ceftriaxone', ARRAY['CRO', 'CEFTRIAXONE', 'Rocephin'], 'Cephalosporins'),
  ('Ceftazidime', ARRAY['CAZ', 'CEFTAZIDIME', 'Fortaz'], 'Cephalosporins'),
  ('Cefotaxime', ARRAY['CTX', 'CEFOTAXIME', 'Claforan'], 'Cephalosporins'),
  ('Cefepime', ARRAY['FEP', 'CEFEPIME', 'Maxipime'], 'Cephalosporins'),
  ('Cefuroxime', ARRAY['CXM', 'CEFUROXIME', 'Zinacef'], 'Cephalosporins'),
  ('Imipenem', ARRAY['IPM', 'IMIPENEM', 'Tienam'], 'Carbapenems'),
  ('Meropenem', ARRAY['MEM', 'MEROPENEM', 'Merrem'], 'Carbapenems'),
  ('Ertapenem', ARRAY['ETP', 'ERTAPENEM', 'Invanz'], 'Carbapenems'),
  ('Ciprofloxacin', ARRAY['CIP', 'CIPROFLOXACIN', 'Cipro'], 'Fluoroquinolones'),
  ('Levofloxacin', ARRAY['LVX', 'LEVOFLOXACIN', 'Levaquin'], 'Fluoroquinolones'),
  ('Gentamicin', ARRAY['GEN', 'GM', 'GENTAMICIN', 'Gentamicine'], 'Aminoglycosides'),
  ('Amikacin', ARRAY['AMK', 'AK', 'AMIKACIN', 'Amikacine'], 'Aminoglycosides'),
  ('Trimethoprim-Sulfamethoxazole', ARRAY['SXT', 'TMP-SMX', 'Co-trimoxazole', 'Bactrim', 'TRIMETHOPRIM-SULFAMETHOXAZOLE', 'Cotrimoxazole'], 'Sulfonamides'),
  ('Vancomycin', ARRAY['VAN', 'VANCOMYCIN', 'Vancomycine'], 'Glycopeptides'),
  ('Metronidazole', ARRAY['MTZ', 'METRONIDAZOLE', 'Flagyl'], 'Nitroimidazoles'),
  ('Nitrofurantoin', ARRAY['NIT', 'NITROFURANTOIN', 'Furadantin'], 'Nitrofurans'),
  ('Colistin', ARRAY['COL', 'CST', 'COLISTIN', 'Polymyxin E'], 'Polymyxins'),
  ('Tetracycline', ARRAY['TET', 'TE', 'TETRACYCLINE', 'Tetracycline'], 'Tetracyclines'),
  ('Doxycycline', ARRAY['DOX', 'DOXYCYCLINE', 'Vibramycin'], 'Tetracyclines'),
  ('Erythromycin', ARRAY['ERY', 'ERYTHROMYCIN', 'Erythromycine'], 'Macrolides'),
  ('Azithromycin', ARRAY['AZM', 'AZITHROMYCIN', 'Zithromax'], 'Macrolides'),
  ('Chloramphenicol', ARRAY['CHL', 'CHLORAMPHENICOL', 'Chloramphénicol'], 'Phenicols'),
  ('Linezolid', ARRAY['LZD', 'LINEZOLID', 'Zyvox'], 'Oxazolidinones'),
  ('Fosfomycin', ARRAY['FOS', 'FOSFOMYCIN', 'Monuril'], 'Phosphonic acids');

-- Common specimen types
INSERT INTO reference_specimens (canonical_name, aliases) VALUES
  ('Blood', ARRAY['blood', 'BLOOD', 'Sang', 'Blood culture', 'Hémoculture', 'BC']),
  ('Urine', ARRAY['urine', 'URINE', 'Urines', 'ECBU', 'Midstream urine', 'MSU']),
  ('Sputum', ARRAY['sputum', 'SPUTUM', 'Crachat', 'Expectoration']),
  ('Wound swab', ARRAY['wound', 'WOUND', 'Wound swab', 'Pus', 'Plaie', 'Abscess', 'wound swab']),
  ('Stool', ARRAY['stool', 'STOOL', 'Selles', 'Feces', 'Faeces']),
  ('CSF', ARRAY['csf', 'CSF', 'Cerebrospinal fluid', 'LCR', 'Liquide céphalo-rachidien']),
  ('BAL', ARRAY['bal', 'BAL', 'Bronchoalveolar lavage', 'LBA']),
  ('Throat swab', ARRAY['throat', 'THROAT', 'Throat swab', 'Gorge', 'Pharyngeal swab']),
  ('Genital', ARRAY['genital', 'GENITAL', 'Vaginal swab', 'Urethral swab', 'Cervical swab']),
  ('Catheter tip', ARRAY['catheter', 'CATHETER', 'Catheter tip', 'KT', 'Line tip']);

-- ============================================================
-- 9. TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_laboratories_updated
  BEFORE UPDATE ON laboratories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_uploads_updated
  BEFORE UPDATE ON uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. FUNCTION: Create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, laboratory_id, full_name, role)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'laboratory_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technician')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
