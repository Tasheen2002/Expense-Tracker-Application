ALTER TABLE categorization_rules.category_rules
  ADD CONSTRAINT category_rules_priority_nonnegative CHECK (priority >= 0),
  ADD CONSTRAINT category_rules_name_nonblank CHECK (length(btrim(name)) > 0 AND name = btrim(name)),
  ADD CONSTRAINT category_rules_deleted_inactive CHECK (deleted_at IS NULL OR is_active = false);

ALTER TABLE categorization_rules.category_suggestions
  ADD CONSTRAINT category_suggestions_confidence_range CHECK (confidence >= 0 AND confidence <= 1),
  ADD CONSTRAINT category_suggestions_response_state CHECK (
    (is_accepted IS NULL AND responded_at IS NULL) OR
    (is_accepted IS NOT NULL AND responded_at IS NOT NULL AND responded_at >= created_at)
  );
