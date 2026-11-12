-- GymOS › Settings › Email: the gym's own SMTP mailbox.
--
-- One row per gym database. When it is filled in and enabled, every email GymBios sends for
-- this gym (BiOS reports, attendance reports, face-device reports, member codes, …) goes out
-- through it; otherwise the server-wide SMTP_* environment settings are used, as before.

CREATE TABLE IF NOT EXISTS email_settings (
    id                 BIGSERIAL PRIMARY KEY,
    enabled            BOOLEAN      NOT NULL DEFAULT TRUE,
    host               VARCHAR(255),
    port               INTEGER,
    -- SSL (usually port 465) | STARTTLS (usually 587) | NONE
    security           VARCHAR(10)  NOT NULL DEFAULT 'SSL',
    username           VARCHAR(255),
    -- AES-GCM, same scheme as tenant DB credentials (CredentialEncryptionService).
    password_enc       TEXT,
    from_email         VARCHAR(255),
    from_name          VARCHAR(255),
    reply_to           VARCHAR(255),
    last_test_at       TIMESTAMP,
    last_test_ok       BOOLEAN,
    last_test_message  TEXT,
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP,
    created_by         VARCHAR(255),
    updated_by         VARCHAR(255)
);
