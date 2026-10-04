-- Enforce ON DELETE CASCADE on every FK referencing mutoon(id).
-- Idempotent: rebuild each single-column FK (drop + re-add) with the cascade
-- rule, so deleting a matn keeps succeeding even in environments where the
-- FK was created manually WITHOUT ON DELETE CASCADE (the reported bug).
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT
      t.relname  AS tablename,
      a.attname  AS colname,
      c.conname  AS conname,
      fc.relname AS reftable,
      fa.attname AS refcol
    FROM pg_constraint c
    JOIN pg_class t  ON t.oid  = c.conrelid
    JOIN pg_class fc ON fc.oid = c.confrelid
    JOIN pg_attribute a  ON a.attrelid  = c.conrelid  AND a.attnum  = c.conkey[1]
    JOIN pg_attribute fa ON fa.attrelid = c.confrelid AND fa.attnum = c.confkey[1]
    JOIN pg_namespace n  ON n.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND fc.relname = 'mutoon'
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', fk.tablename, fk.conname);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE CASCADE',
      fk.tablename, fk.conname, fk.colname, fk.reftable, fk.refcol
    );
    RAISE NOTICE 'Rebuilt FK % on %.% -> % ON DELETE CASCADE', fk.conname, fk.tablename, fk.colname, fk.reftable;
  END LOOP;
END $$;
