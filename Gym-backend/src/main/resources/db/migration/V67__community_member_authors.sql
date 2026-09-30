-- V67__community_member_authors.sql
-- GymBios app accounts have no tenant users row, so community posts, comments
-- and likes can now be attributed to the members row their membership purchase
-- created instead. Exactly one of the user / member columns is set per row.
--
-- The community tables are created by Hibernate (ddl-auto=update), so every
-- statement tolerates the table not existing yet on a freshly provisioned
-- tenant; Hibernate then creates it from the entities with these columns.

ALTER TABLE IF EXISTS community_posts ALTER COLUMN author_user_id DROP NOT NULL;
ALTER TABLE IF EXISTS community_posts ADD COLUMN IF NOT EXISTS author_member_id BIGINT;

ALTER TABLE IF EXISTS community_post_comments ALTER COLUMN author_user_id DROP NOT NULL;
ALTER TABLE IF EXISTS community_post_comments ADD COLUMN IF NOT EXISTS author_member_id BIGINT;

ALTER TABLE IF EXISTS community_post_likes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE IF EXISTS community_post_likes ADD COLUMN IF NOT EXISTS member_id BIGINT;

DO $$
BEGIN
    IF to_regclass('community_posts') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_community_posts_author_member ON community_posts(author_member_id);
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_community_posts_one_author') THEN
            ALTER TABLE community_posts ADD CONSTRAINT ck_community_posts_one_author
                CHECK ((author_user_id IS NULL) <> (author_member_id IS NULL));
        END IF;
    END IF;

    IF to_regclass('community_post_comments') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_community_post_comments_author_member ON community_post_comments(author_member_id);
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_community_post_comments_one_author') THEN
            ALTER TABLE community_post_comments ADD CONSTRAINT ck_community_post_comments_one_author
                CHECK ((author_user_id IS NULL) <> (author_member_id IS NULL));
        END IF;
    END IF;

    IF to_regclass('community_post_likes') IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_community_post_member_like') THEN
            ALTER TABLE community_post_likes ADD CONSTRAINT uq_community_post_member_like UNIQUE (post_id, member_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_community_post_likes_one_liker') THEN
            ALTER TABLE community_post_likes ADD CONSTRAINT ck_community_post_likes_one_liker
                CHECK ((user_id IS NULL) <> (member_id IS NULL));
        END IF;
    END IF;
END $$;
