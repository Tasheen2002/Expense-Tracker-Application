ALTER TABLE categorization_rules.category_rules
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT category_rule_version_positive CHECK (version > 0);
