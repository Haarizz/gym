package com.company.project.services.accounts;

import com.company.project.dto.MemberRequestDTO;
import com.company.project.dto.mobile.profile.MobileProfileDTO;
import com.company.project.entities.Member;
import com.company.project.entities.UserProfile;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Function;

/**
 * The details a person owns about themselves (docs/global-accounts-for-gym-created-members-plan.md §3):
 * kept on their GymBios account's profile (main-DB user_profiles) and copied to the
 * members row of every gym they belong to. Plan, fees, payments, notes, branch and
 * status are gym-only and never appear here.
 *
 * One mapping for every direction — app edit → gyms, staff edit → account, linking —
 * so they can't drift apart. Name and phone are never blanked on either side.
 */
public enum IdentityField {

    FULL_NAME("full_name", Member::getName, (m, v) -> m.setName((String) v),
            UserProfile::getFullName, (p, v) -> p.setFullName((String) v)),
    PHONE("phone", Member::getPhone, (m, v) -> m.setPhone((String) v),
            UserProfile::getPhone, (p, v) -> p.setPhone((String) v)),
    DATE_OF_BIRTH("date_of_birth", Member::getDateOfBirth, (m, v) -> m.setDateOfBirth((LocalDate) v),
            UserProfile::getDateOfBirth, (p, v) -> p.setDateOfBirth((LocalDate) v)),
    GENDER("gender", Member::getGender, (m, v) -> m.setGender((String) v),
            UserProfile::getGender, (p, v) -> p.setGender((String) v)),
    NATIONALITY("nationality", Member::getNationality, (m, v) -> m.setNationality((String) v),
            UserProfile::getNationality, (p, v) -> p.setNationality((String) v)),
    ADDRESS("address", Member::getAddress, (m, v) -> m.setAddress((String) v),
            UserProfile::getAddress, (p, v) -> p.setAddress((String) v)),
    // The web form fills both emergency pairs on the members row; the profile's
    // emergency_contact / emergency_phone are what the app shows.
    EMERGENCY_CONTACT("emergency_contact",
            m -> firstText(m.getEmergencyContactName(), m.getEmergencyContact()),
            (m, v) -> { m.setEmergencyContact((String) v); m.setEmergencyContactName((String) v); },
            UserProfile::getEmergencyContact, (p, v) -> p.setEmergencyContact((String) v)),
    EMERGENCY_PHONE("emergency_phone",
            m -> firstText(m.getEmergencyContactPhone(), m.getEmergencyPhone()),
            (m, v) -> { m.setEmergencyPhone((String) v); m.setEmergencyContactPhone((String) v); },
            UserProfile::getEmergencyPhone, (p, v) -> p.setEmergencyPhone((String) v)),
    BLOOD_TYPE("blood_type", Member::getBloodType, (m, v) -> m.setBloodType((String) v),
            UserProfile::getBloodType, (p, v) -> p.setBloodType((String) v)),
    MEDICAL_CONDITIONS("medical_conditions", Member::getMedicalConditions, (m, v) -> m.setMedicalConditions((String) v),
            UserProfile::getMedicalConditions, (p, v) -> p.setMedicalConditions((String) v)),
    ALLERGIES("allergies", Member::getAllergies, (m, v) -> m.setAllergies((String) v),
            UserProfile::getAllergies, (p, v) -> p.setAllergies((String) v)),
    CURRENT_MEDICATIONS("current_medications", Member::getCurrentMedications, (m, v) -> m.setCurrentMedications((String) v),
            UserProfile::getCurrentMedications, (p, v) -> p.setCurrentMedications((String) v)),
    CHRONIC_ILLNESSES("chronic_illnesses", Member::getChronicIllnesses, (m, v) -> m.setChronicIllnesses((String) v),
            UserProfile::getChronicIllnesses, (p, v) -> p.setChronicIllnesses((String) v)),
    HEALTH_NOTES("health_notes", Member::getHealthNotes, (m, v) -> m.setHealthNotes((String) v),
            UserProfile::getHealthNotes, (p, v) -> p.setHealthNotes((String) v)),
    HEIGHT("height", Member::getHeight, (m, v) -> m.setHeight((Double) v),
            UserProfile::getHeight, (p, v) -> p.setHeight((Double) v)),
    WEIGHT("weight", Member::getWeight, (m, v) -> m.setWeight((Double) v),
            UserProfile::getWeight, (p, v) -> p.setWeight((Double) v)),
    PHOTO_URL("photo_url", Member::getPhotoUrl, (m, v) -> m.setPhotoUrl((String) v),
            UserProfile::getPhotoUrl, (p, v) -> p.setPhotoUrl((String) v));

    /** user_profiles column, for writing the main database over JDBC (GlobalAccountService). */
    public final String column;
    private final Function<Member, Object> memberGetter;
    private final BiConsumer<Member, Object> memberSetter;
    private final Function<UserProfile, Object> profileGetter;
    private final BiConsumer<UserProfile, Object> profileSetter;

    @SuppressWarnings("unchecked")
    <A, B> IdentityField(String column, Function<Member, A> memberGetter, BiConsumer<Member, Object> memberSetter,
                         Function<UserProfile, B> profileGetter, BiConsumer<UserProfile, Object> profileSetter) {
        this.column = column;
        this.memberGetter = (Function<Member, Object>) memberGetter;
        this.memberSetter = memberSetter;
        this.profileGetter = (Function<UserProfile, Object>) profileGetter;
        this.profileSetter = profileSetter;
    }

    public Object of(Member member) { return memberGetter.apply(member); }
    public Object of(UserProfile profile) { return profileGetter.apply(profile); }

    /** Name and phone can't be cleared: a blank value for them is ignored. */
    public boolean required() { return this == FULL_NAME || this == PHONE; }

    // ── Which fields an edit touched ────────────────────────────────────────

    /** Fields an app profile edit sent (null = not part of the edit). */
    public static Set<IdentityField> changedBy(MobileProfileDTO r) {
        Set<IdentityField> s = EnumSet.noneOf(IdentityField.class);
        if (r.getFullName() != null) s.add(FULL_NAME);
        if (r.getPhone() != null) s.add(PHONE);
        if (r.getDateOfBirth() != null) s.add(DATE_OF_BIRTH);
        if (r.getGender() != null) s.add(GENDER);
        if (r.getNationality() != null) s.add(NATIONALITY);
        if (r.getAddress() != null) s.add(ADDRESS);
        if (r.getEmergencyContact() != null) s.add(EMERGENCY_CONTACT);
        if (r.getEmergencyPhone() != null) s.add(EMERGENCY_PHONE);
        if (r.getBloodType() != null) s.add(BLOOD_TYPE);
        if (r.getMedicalConditions() != null) s.add(MEDICAL_CONDITIONS);
        if (r.getAllergies() != null) s.add(ALLERGIES);
        if (r.getCurrentMedications() != null) s.add(CURRENT_MEDICATIONS);
        if (r.getChronicIllnesses() != null) s.add(CHRONIC_ILLNESSES);
        if (r.getHeight() != null) s.add(HEIGHT);
        if (r.getWeight() != null) s.add(WEIGHT);
        if (r.getPhotoUrl() != null) s.add(PHOTO_URL);
        return s;
    }

    /** Fields a staff edit of the member record sent (MemberService.applyRequest). */
    public static Set<IdentityField> changedBy(MemberRequestDTO r) {
        Set<IdentityField> s = EnumSet.noneOf(IdentityField.class);
        if (r.getName() != null) s.add(FULL_NAME);
        if (r.getPhone() != null) s.add(PHONE);
        if (r.getDateOfBirth() != null) s.add(DATE_OF_BIRTH);
        if (r.getGender() != null) s.add(GENDER);
        if (r.getNationality() != null) s.add(NATIONALITY);
        if (r.getAddress() != null) s.add(ADDRESS);
        if (r.getEmergencyContact() != null || r.getEmergencyContactName() != null) s.add(EMERGENCY_CONTACT);
        if (r.getEmergencyPhone() != null || r.getEmergencyContactPhone() != null) s.add(EMERGENCY_PHONE);
        if (r.getBloodType() != null) s.add(BLOOD_TYPE);
        if (r.getMedicalConditions() != null) s.add(MEDICAL_CONDITIONS);
        if (r.getAllergies() != null) s.add(ALLERGIES);
        if (r.getCurrentMedications() != null) s.add(CURRENT_MEDICATIONS);
        if (r.getChronicIllnesses() != null) s.add(CHRONIC_ILLNESSES);
        if (r.getHealthNotes() != null) s.add(HEALTH_NOTES);
        if (r.getHeight() != null) s.add(HEIGHT);
        if (r.getWeight() != null) s.add(WEIGHT);
        if (r.getPhotoUrl() != null) s.add(PHOTO_URL);
        return s;
    }

    // ── Copying ─────────────────────────────────────────────────────────────

    public static Map<IdentityField, Object> valuesOf(Member member) {
        Map<IdentityField, Object> values = new EnumMap<>(IdentityField.class);
        for (IdentityField f : values()) values.put(f, f.of(member));
        return values;
    }

    public static Map<IdentityField, Object> valuesOf(UserProfile profile) {
        Map<IdentityField, Object> values = new EnumMap<>(IdentityField.class);
        for (IdentityField f : values()) values.put(f, f.of(profile));
        return values;
    }

    /** Overwrites these fields on the member (blank name/phone ignored). Returns whether anything changed. */
    public static boolean apply(Map<IdentityField, Object> values, Set<IdentityField> fields, Member member) {
        boolean changed = false;
        for (IdentityField f : fields) {
            Object v = blankToNull(values.get(f));
            if (v == null && f.required()) continue;
            if (!java.util.Objects.equals(blankToNull(f.of(member)), v)) {
                f.memberSetter.accept(member, v);
                changed = true;
            }
        }
        return changed;
    }

    /** Overwrites these fields on the profile (blank name/phone ignored). */
    public static void apply(Map<IdentityField, Object> values, Set<IdentityField> fields, UserProfile profile) {
        for (IdentityField f : fields) {
            Object v = blankToNull(values.get(f));
            if (v == null && f.required()) continue;
            f.profileSetter.accept(profile, v);
        }
    }

    /** Copies only what the source has: a blank on the source leaves the target's value alone. */
    public static void applyFilled(Map<IdentityField, Object> values, UserProfile profile) {
        for (IdentityField f : values()) {
            Object v = blankToNull(values.get(f));
            if (v != null) f.profileSetter.accept(profile, v);
        }
    }

    /** Fills only the member's empty fields — linking never overwrites what the gym recorded. */
    public static boolean fillGaps(Map<IdentityField, Object> values, Member member) {
        boolean changed = false;
        for (IdentityField f : values()) {
            Object v = blankToNull(values.get(f));
            if (v != null && blankToNull(f.of(member)) == null) {
                f.memberSetter.accept(member, v);
                changed = true;
            }
        }
        return changed;
    }

    static Object blankToNull(Object v) {
        return v instanceof String s && !StringUtils.hasText(s) ? null : v;
    }

    private static String firstText(String a, String b) {
        if (StringUtils.hasText(a)) return a;
        return StringUtils.hasText(b) ? b : null;
    }
}
