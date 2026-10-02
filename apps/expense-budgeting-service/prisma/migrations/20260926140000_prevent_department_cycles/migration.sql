-- Department ancestry spans multiple rows. Serialize hierarchy changes per workspace
-- so concurrent reparenting cannot create a cycle after application validation.
CREATE FUNCTION "cost_allocation"."reject_department_cycle"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  creates_cycle boolean;
BEGIN
  IF NEW."parent_department_id" IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."workspace_id"::text, 7011));

  WITH RECURSIVE ancestors AS (
    SELECT d."id", d."parent_department_id", ARRAY[d."id"] AS path
    FROM "cost_allocation"."departments" d
    WHERE d."id" = NEW."parent_department_id"
      AND d."workspace_id" = NEW."workspace_id"
    UNION ALL
    SELECT d."id", d."parent_department_id", a.path || d."id"
    FROM "cost_allocation"."departments" d
    JOIN ancestors a ON d."id" = a."parent_department_id"
    WHERE d."workspace_id" = NEW."workspace_id"
      AND NOT d."id" = ANY(a.path)
  )
  SELECT EXISTS (SELECT 1 FROM ancestors WHERE "id" = NEW."id")
  INTO creates_cycle;

  IF creates_cycle THEN
    RAISE EXCEPTION 'Department hierarchy cannot contain a cycle'
      USING ERRCODE = '23514', CONSTRAINT = 'departments_acyclic_hierarchy';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "departments_reject_cycle"
BEFORE INSERT OR UPDATE OF "parent_department_id", "workspace_id"
ON "cost_allocation"."departments"
FOR EACH ROW
EXECUTE FUNCTION "cost_allocation"."reject_department_cycle"();
