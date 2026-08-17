-- Referred person's photo (base64 data URL), captured or uploaded on the Add
-- Referral form for gym access verification. Same storage pattern as
-- members.photo_url — no separate file storage in this app.
ALTER TABLE referrals ADD COLUMN referee_photo TEXT;
