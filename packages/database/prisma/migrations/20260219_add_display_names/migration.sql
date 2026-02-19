ALTER TABLE members ADD COLUMN IF NOT EXISTS display_name VARCHAR(200);

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS rank_prefix VARCHAR(50);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS display_name VARCHAR(200);

-- Best-effort split of legacy visitor names
WITH parsed AS (
  SELECT
    id,
    regexp_replace(trim(name), '\\s+', ' ', 'g') AS normalized_name,
    regexp_split_to_array(regexp_replace(trim(name), '\\s+', ' ', 'g'), '\\s+') AS parts
  FROM visitors
), split AS (
  SELECT
    id,
    normalized_name,
    CASE
      WHEN array_length(parts, 1) >= 3
       AND lower(regexp_replace(parts[1], '\\.+$', '')) IN ('mr','mrs','ms','dr','cpl','sgt','wo','mwo','cwo','lt','capt','maj','lcol','col')
      THEN parts[1]
      ELSE NULL
    END AS rank_prefix,
    CASE
      WHEN array_length(parts, 1) >= 3
       AND lower(regexp_replace(parts[1], '\\.+$', '')) IN ('mr','mrs','ms','dr','cpl','sgt','wo','mwo','cwo','lt','capt','maj','lcol','col')
      THEN parts[2]
      WHEN array_length(parts, 1) >= 2 THEN parts[1]
      ELSE NULL
    END AS first_name,
    CASE
      WHEN array_length(parts, 1) >= 3
       AND lower(regexp_replace(parts[1], '\\.+$', '')) IN ('mr','mrs','ms','dr','cpl','sgt','wo','mwo','cwo','lt','capt','maj','lcol','col')
      THEN array_to_string(parts[3:array_length(parts, 1)], ' ')
      WHEN array_length(parts, 1) >= 2 THEN array_to_string(parts[2:array_length(parts, 1)], ' ')
      WHEN array_length(parts, 1) = 1 THEN parts[1]
      ELSE NULL
    END AS last_name
  FROM parsed
)
UPDATE visitors v
SET
  rank_prefix = COALESCE(v.rank_prefix, NULLIF(trim(split.rank_prefix), '')),
  first_name = COALESCE(v.first_name, NULLIF(trim(split.first_name), '')),
  last_name = COALESCE(v.last_name, NULLIF(trim(split.last_name), ''))
FROM split
WHERE v.id = split.id;

-- Member display names with collision handling
WITH member_base AS (
  SELECT
    id,
    COALESCE(NULLIF(trim(rank), ''), '') AS rank,
    COALESCE(NULLIF(trim(first_name), ''), '') AS first_name,
    COALESCE(NULLIF(trim(last_name), ''), '') AS last_name,
    COALESCE(NULLIF(trim(initials), ''), '') AS initials,
    lower(COALESCE(NULLIF(trim(last_name), ''), '')) AS last_name_key,
    lower(COALESCE(NULLIF(trim(initials), ''), substring(COALESCE(NULLIF(trim(first_name), ''), '') FROM 1 FOR 1), '')) AS initials_key
  FROM members
), member_collisions AS (
  SELECT
    last_name_key,
    initials_key,
    COUNT(*) AS cnt
  FROM member_base
  WHERE last_name_key <> '' AND initials_key <> ''
  GROUP BY last_name_key, initials_key
)
UPDATE members m
SET display_name = CASE
  WHEN b.last_name = '' THEN NULL
  WHEN COALESCE(c.cnt, 0) > 1 AND b.first_name <> '' THEN
    trim(concat(CASE WHEN b.rank <> '' THEN b.rank || ' ' ELSE '' END, b.last_name || ', ' || b.first_name))
  WHEN COALESCE(b.initials, '') <> '' THEN
    trim(concat(CASE WHEN b.rank <> '' THEN b.rank || ' ' ELSE '' END, b.last_name || ', ' || b.initials))
  WHEN b.first_name <> '' THEN
    trim(concat(CASE WHEN b.rank <> '' THEN b.rank || ' ' ELSE '' END, b.last_name || ', ' || substring(b.first_name FROM 1 FOR 1)))
  ELSE trim(concat(CASE WHEN b.rank <> '' THEN b.rank || ' ' ELSE '' END, b.last_name))
END
FROM member_base b
LEFT JOIN member_collisions c
  ON c.last_name_key = b.last_name_key
 AND c.initials_key = b.initials_key
WHERE m.id = b.id;

-- Visitor display names with collision handling and legacy fallback
WITH visitor_base AS (
  SELECT
    id,
    COALESCE(NULLIF(trim(rank_prefix), ''), '') AS rank_prefix,
    COALESCE(NULLIF(trim(first_name), ''), '') AS first_name,
    COALESCE(NULLIF(trim(last_name), ''), '') AS last_name,
    COALESCE(NULLIF(trim(name), ''), '') AS legacy_name,
    lower(COALESCE(NULLIF(trim(last_name), ''), '')) AS last_name_key,
    lower(COALESCE(NULLIF(substring(trim(first_name) FROM 1 FOR 1), ''), '')) AS initials_key
  FROM visitors
), visitor_collisions AS (
  SELECT
    last_name_key,
    initials_key,
    COUNT(*) AS cnt
  FROM visitor_base
  WHERE last_name_key <> '' AND initials_key <> ''
  GROUP BY last_name_key, initials_key
)
UPDATE visitors v
SET
  name = CASE
    WHEN b.rank_prefix <> '' OR b.first_name <> '' OR b.last_name <> ''
      THEN trim(concat_ws(' ', NULLIF(b.rank_prefix, ''), NULLIF(b.first_name, ''), NULLIF(b.last_name, '')))
    ELSE b.legacy_name
  END,
  display_name = CASE
    WHEN b.last_name = '' THEN b.legacy_name
    WHEN COALESCE(c.cnt, 0) > 1 AND b.first_name <> '' THEN
      trim(concat(CASE WHEN b.rank_prefix <> '' THEN b.rank_prefix || ' ' ELSE '' END, b.last_name || ', ' || b.first_name))
    WHEN b.first_name <> '' THEN
      trim(concat(CASE WHEN b.rank_prefix <> '' THEN b.rank_prefix || ' ' ELSE '' END, b.last_name || ', ' || substring(b.first_name FROM 1 FOR 1)))
    ELSE trim(concat(CASE WHEN b.rank_prefix <> '' THEN b.rank_prefix || ' ' ELSE '' END, b.last_name))
  END
FROM visitor_base b
LEFT JOIN visitor_collisions c
  ON c.last_name_key = b.last_name_key
 AND c.initials_key = b.initials_key
WHERE v.id = b.id;
