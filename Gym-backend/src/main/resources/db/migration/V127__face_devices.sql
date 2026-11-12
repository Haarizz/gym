-- GymOS › Face Device Configuration.
--
-- Face-recognition entry terminals (Heystar) reached through their HTTP middleware,
-- the same API the old GymBios PHP cron used: person/create (name + valid-from/to),
-- face/merge (photo) and face/delete. GymBios pushes each member of the device's
-- branch: active members get their photo enrolled, anyone who may not enter
-- (expired, frozen, suspended, pending) has their face removed.

CREATE TABLE IF NOT EXISTS face_devices (
    id                 BIGSERIAL PRIMARY KEY,
    branch_id          BIGINT       NOT NULL,
    name               VARCHAR(120) NOT NULL,
    location           VARCHAR(255),
    -- Middleware base address, e.g. http://77.37.54.38:8080 (no trailing slash).
    middleware_url     VARCHAR(500) NOT NULL,
    -- Device serial ("deviceKey") and device password ("secret") from the terminal.
    device_key         VARCHAR(120) NOT NULL,
    device_secret      VARCHAR(255) NOT NULL,
    -- Access-control group the person is placed in, and verifyStyle (1 = face only).
    access_group       INTEGER      NOT NULL DEFAULT 1,
    verify_style       INTEGER      NOT NULL DEFAULT 1,
    -- Zone the membership dates are read in when sent as valid-from/to instants.
    time_zone          VARCHAR(64)  NOT NULL DEFAULT 'UTC',
    -- Optional public address of this GymBios server; when set, photos are also
    -- sent as imgUrl (they are always sent as imgBase64).
    photo_base_url     VARCHAR(500),
    enabled            BOOLEAN      NOT NULL DEFAULT TRUE,
    auto_sync          BOOLEAN      NOT NULL DEFAULT TRUE,
    last_test_at       TIMESTAMP,
    last_test_ok       BOOLEAN,
    last_test_message  TEXT,
    last_sync_at       TIMESTAMP,
    last_sync_message  TEXT,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP,
    created_by         VARCHAR(255),
    updated_by         VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_face_devices_branch ON face_devices (branch_id);

-- What GymBios last pushed for each member to each device.
CREATE TABLE IF NOT EXISTS face_device_members (
    id               BIGSERIAL PRIMARY KEY,
    device_id        BIGINT       NOT NULL REFERENCES face_devices (id) ON DELETE CASCADE,
    member_id        BIGINT       NOT NULL,
    -- Person serial on the device (the member code, e.g. GYM20270236).
    person_sn        VARCHAR(120) NOT NULL,
    -- ENROLLED | NO_PHOTO | REMOVED | NOT_ON_DEVICE | FAILED | RETRY
    state            VARCHAR(20)  NOT NULL,
    -- Hash of what was pushed (name, dates, allowed, photo, device settings); a
    -- member is re-pushed when it changes. NULL forces the next run to push.
    fingerprint      VARCHAR(64),
    last_message     TEXT,
    attempts         INTEGER      NOT NULL DEFAULT 0,
    last_attempt_at  TIMESTAMP,
    last_success_at  TIMESTAMP,
    CONSTRAINT uq_face_device_members UNIQUE (device_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_face_device_members_device ON face_device_members (device_id, state);
