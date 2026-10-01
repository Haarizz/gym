-- V72__community_cross_gym_participants.sql
-- A GymBios app account with an active membership at ANY gym may like and
-- comment in every gym's community. In a gym where it has no members row it
-- has nothing local to point at, so likes and comments can now be attributed
-- to the global account id itself (members.global_user_id space), with the
-- commenter's name captured at write time since that profile lives in
-- another database. Exactly one of the user / member / global columns is set.
--
-- Additive only: new nullable columns, and the V67 "exactly one of two"
-- checks widened to "exactly one of three" — every existing row already has
-- exactly one of the first two set and the new column NULL, so it still passes.
-- The new checks are added NOT VALID anyway so a legacy row on a tenant that
-- never had the V67 checks can't fail this migration; new rows are enforced.
--
-- The community tables are created by Hibernate (ddl-auto=update), so every
-- statement tolerates the table not existing yet on a freshly provisioned
-- tenant; Hibernate then creates it from the entities with these columns.

ALTER TABLE IF EXISTS community_post_comments ADD COLUMN IF NOT EXISTS author_global_user_id BIGINT;
ALTER TABLE IF EXISTS community_post_comments ADD COLUMN IF NOT EXISTS author_display_name VARCHAR(255);

ALTER TABLE IF EXISTS community_post_likes ADD COLUMN IF NOT EXISTS global_user_id BIGINT;

DO $$
BEGIN
    IF to_regclass('community_post_comments') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_community_post_comments_author_global_user
            ON community_post_comments(author_global_user_id);
        ALTER TABLE community_post_comments DROP CONSTRAINT IF EXISTS ck_community_post_comments_one_author;
        ALTER TABLE community_post_comments ADD CONSTRAINT ck_community_post_comments_one_author
            CHECK (num_nonnulls(author_user_id, author_member_id, author_global_user_id) = 1) NOT VALID;
    END IF;

    IF to_regclass('community_post_likes') IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_community_post_global_like') THEN
            ALTER TABLE community_post_likes ADD CONSTRAINT uq_community_post_global_like UNIQUE (post_id, global_user_id);
        END IF;
        ALTER TABLE community_post_likes DROP CONSTRAINT IF EXISTS ck_community_post_likes_one_liker;
        ALTER TABLE community_post_likes ADD CONSTRAINT ck_community_post_likes_one_liker
            CHECK (num_nonnulls(user_id, member_id, global_user_id) = 1) NOT VALID;
    END IF;
END $$;
