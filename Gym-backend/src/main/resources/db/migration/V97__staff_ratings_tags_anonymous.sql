-- V97__staff_ratings_tags_anonymous.sql
-- tags and anonymous were added to V96 after some tenant databases had already
-- created staff_ratings from its first version, so CREATE TABLE IF NOT EXISTS
-- skipped them there. Add them where missing; a no-op everywhere else.

ALTER TABLE staff_ratings ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE staff_ratings ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT false;
