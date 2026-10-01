-- V70__normalize_member_active_status.sql
-- Payment approval (MemberService.approveMemberPayment) used to write
-- membership_status = 'Active' while everything else writes 'active'. Check-in and
-- the web/mobile check-in screens compared case-sensitively, so approved members
-- were shown as not active and refused at the door. Normalize the stored value.

UPDATE members
SET membership_status = 'active'
WHERE membership_status = 'Active';
