import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import {
  Button,
  Input,
  Typography,
  DatePicker,
  Dropdown,
} from '@/shared/components';
import { AvatarPicker } from '@/shared/components/AvatarPicker';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { useMobileProfile } from '../../hooks/useMobileProfile';
import {
  profileCompletionSchema,
  type ProfileCompletionValues,
} from '../components/ProfileCompletion/schemas';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const STEP_META = {
  1: { title: 'Personal details', sub: 'Tell us a bit about yourself' },
  2: { title: 'Health information', sub: 'For your safety during training' },
  3: { title: 'Emergency contact', sub: 'In case we need to reach someone' },
} as const;

const STEP_LABELS = ['Personal', 'Health', 'Emergency'];

const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
];

const NATIONALITY_OPTIONS = [
  { label: 'Indian', value: 'Indian' },
  { label: 'Emirati', value: 'Emirati' },
  { label: 'British', value: 'British' },
  { label: 'American', value: 'American' },
  { label: 'Pakistani', value: 'Pakistani' },
  { label: 'Bangladeshi', value: 'Bangladeshi' },
  { label: 'Filipino', value: 'Filipino' },
  { label: 'Egyptian', value: 'Egyptian' },
  { label: 'Other', value: 'Other' },
];

const BLOOD_TYPE_OPTIONS = [
  { label: 'O+', value: 'O+' },
  { label: 'O-', value: 'O-' },
  { label: 'A+', value: 'A+' },
  { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB-', value: 'AB-' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionCardProps {
  iconName: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function SectionCard({
  iconName,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
}: SectionCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
          <Feather name={iconName} size={18} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Typography variant="subtitle" style={styles.cardTitle}>
            {title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {subtitle}
          </Typography>
        </View>
      </View>
      {children}
    </View>
  );
}

interface CharTextInputProps {
  label: string;
  optional?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
}

function CharTextInput({
  label,
  optional,
  value,
  onChangeText,
  placeholder,
  maxLength = 500,
}: CharTextInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Typography variant="bodySmallBold" style={styles.fieldLabel}>
        {label}{' '}
        {optional && (
          <Typography variant="bodySmall" color="textSecondary">
            (optional)
          </Typography>
        )}
      </Typography>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline
        numberOfLines={3}
        maxLength={maxLength}
        style={[
          styles.textarea,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      />
      <Typography
        variant="caption"
        color="textSecondary"
        style={styles.charCount}
      >
        {value.length}/{maxLength}
      </Typography>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function ProfileCompletionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [dateValue, setDateValue] = useState<Date | undefined>(undefined);
  const { updateProfile, isUpdating } = useMobileProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    setValue,
  } = useForm<ProfileCompletionValues>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      nationality: '',
      address: '',
      emergencyContact: '',
      emergencyPhone: '',
      bloodType: '',
      medicalConditions: '',
    },
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  const onNext = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger([
        'fullName',
        'phone',
        'dateOfBirth',
        'gender',
        'nationality',
        'address',
      ]);
    } else if (step === 2) {
      isValid = true; // health fields are optional
    }
    if (isValid) setStep((s) => s + 1);
  };

  const onBack = () => setStep((s) => s - 1);

  const onSubmit = (data: ProfileCompletionValues) => {
    updateProfile(data, {
      // No manual navigation here — AuthBootstrap's useEffect reactively
      // detects session.profileCompleted = true and navigates to /(member).
      // Manually calling router.replace here caused a black-screen race condition.
      onError: (err: Error) => Alert.alert('Error', err.message),
    });
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const isLastStep = step === TOTAL_STEPS;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.screen }]}
    >
      {/* ── Sticky top bar ── */}
      <View
        style={[
          styles.topbar,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}
      >
        <Pressable
          onPress={step === 1 ? () => router.back() : onBack}
          style={[styles.backBtn, { borderColor: theme.border }]}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={18} color={theme.text} />
        </Pressable>

        <View style={styles.topbarTitles}>
          <Typography variant="subtitle" style={styles.topbarTitle}>
            {STEP_META[step as keyof typeof STEP_META].title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {STEP_META[step as keyof typeof STEP_META].sub}
          </Typography>
        </View>

        <View
          style={[
            styles.stepPill,
            { backgroundColor: BrandColors.screenBackgroundAlt },
          ]}
        >
          <Typography
            variant="caption"
            style={{ color: BrandColors.teal, fontWeight: '700' }}
          >
            Step {step} of {TOTAL_STEPS}
          </Typography>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View
        style={[
          styles.progressWrap,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.progressTrack}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const seg = i + 1;
            const filled = seg <= step;
            return (
              <View
                key={seg}
                style={[styles.progressSeg, { backgroundColor: theme.muted }]}
              >
                {filled && (
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: BrandColors.memberGold },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.progressLabels}>
          {STEP_LABELS.map((label, i) => {
            const active = i + 1 <= step;
            return (
              <Typography
                key={label}
                variant="caption"
                style={[
                  styles.progressLabel,
                  { color: active ? BrandColors.teal : theme.textSecondary },
                ]}
              >
                {label}
              </Typography>
            );
          })}
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════ STEP 1 — PERSONAL ════════════ */}
        {step === 1 && (
          <View style={styles.screenContent}>
            <View style={styles.intro}>
              <Typography variant="title" style={styles.introTitle}>
                Let's set up your profile
              </Typography>
              <Typography
                variant="bodySmall"
                color="textSecondary"
                style={styles.introBody}
              >
                A complete profile helps gyms verify your identity and keep you
                safe during training. It only takes a few minutes.
              </Typography>
            </View>

            {/* Photo card */}
            <View
              style={[
                styles.card,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <AvatarPicker
                name=""
                onChangePhoto={() => {}}
              />
            </View>

            {/* Basic info card */}
            <SectionCard
              iconName="user"
              iconBg={BrandColors.screenBackgroundAlt}
              iconColor={BrandColors.teal}
              title="Basic information"
              subtitle="Your name and contact details"
            >
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Full name *"
                    placeholder="e.g. John Doe"
                    value={value}
                    onChangeText={onChange}
                    error={errors.fullName?.message}
                    containerStyle={styles.field}
                  />
                )}
              />

              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Phone *"
                    placeholder="+91 XXXXX XXXXX"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="phone-pad"
                    error={errors.phone?.message}
                    containerStyle={styles.field}
                  />
                )}
              />

              {/* Date of Birth — uses DatePicker → formats to YYYY-MM-DD */}
              <View style={styles.field}>
                <DatePicker
                  label="Date of birth *"
                  placeholder="Select date"
                  value={dateValue}
                  onChange={(date: Date | null) => {
                    if (!date) return;
                    setDateValue(date);
                    // Store as YYYY-MM-DD string for the API
                    setValue('dateOfBirth', format(date, 'yyyy-MM-dd'), {
                      shouldValidate: true,
                    });
                  }}
                  maximumDate={new Date()}
                  required
                  error={errors.dateOfBirth?.message}
                />
              </View>

              <View style={styles.row2}>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field: { onChange, value } }) => (
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Gender (optional)"
                        placeholder="Select gender"
                        value={value}
                        options={GENDER_OPTIONS}
                        onChange={onChange}
                        error={errors.gender?.message}
                      />
                    </View>
                  )}
                />
                <Controller
                  control={control}
                  name="nationality"
                  render={({ field: { onChange, value } }) => (
                    <View style={{ flex: 1 }}>
                      <Dropdown
                        label="Nationality"
                        placeholder="Select country"
                        value={value}
                        options={NATIONALITY_OPTIONS}
                        onChange={onChange}
                        error={errors.nationality?.message}
                      />
                    </View>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, value } }) => (
                  <AddressAutocomplete
                    label="Address"
                    value={value || ''}
                    onChange={onChange}
                    error={errors.address?.message}
                  />
                )}
              />
            </SectionCard>
          </View>
        )}

        {/* ════════════ STEP 2 — HEALTH ════════════ */}
        {step === 2 && (
          <View style={styles.screenContent}>
            <View style={styles.intro}>
              <Typography variant="title" style={styles.introTitle}>
                Health information
              </Typography>
              <Typography
                variant="bodySmall"
                color="textSecondary"
                style={styles.introBody}
              >
                This helps trainers respond quickly and safely if something comes
                up during a session. All fields are optional but recommended.
              </Typography>
            </View>

            <SectionCard
              iconName="heart"
              iconBg="#fdf3dd"
              iconColor="#d99310"
              title="Medical background"
              subtitle="Optional, helps in an emergency"
            >
              <Controller
                control={control}
                name="medicalConditions"
                render={({ field: { onChange, value } }) => (
                  <CharTextInput
                    label="Medical conditions"
                    optional
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder="e.g. Asthma, Diabetes, High Blood Pressure"
                  />
                )}
              />

              {/* Allergies — display only, not in current API model */}
              <CharTextInput
                label="Allergies"
                optional
                value=""
                onChangeText={() => {}}
                placeholder="e.g. Peanuts, Penicillin, Dust, Latex"
              />

              <CharTextInput
                label="Current medications"
                optional
                value=""
                onChangeText={() => {}}
                placeholder="e.g. Metformin 500mg, Vitamin D 1000IU"
              />

              <CharTextInput
                label="Chronic illnesses"
                optional
                value=""
                onChangeText={() => {}}
                placeholder="e.g. Heart Disease, Arthritis, COPD"
              />

              <Controller
                control={control}
                name="bloodType"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.field}>
                    <Dropdown
                      label="Blood type"
                      placeholder="Select blood type"
                      value={value ?? ''}
                      options={BLOOD_TYPE_OPTIONS}
                      onChange={onChange}
                    />
                  </View>
                )}
              />

              <View style={[styles.row2, { marginTop: 0 }]}>
                <Input
                  label="Height (cm)"
                  placeholder="170"
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
                <Input
                  label="Weight (kg)"
                  placeholder="70"
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            </SectionCard>
          </View>
        )}

        {/* ════════════ STEP 3 — EMERGENCY ════════════ */}
        {step === 3 && (
          <View style={styles.screenContent}>
            <View style={styles.intro}>
              <Typography variant="title" style={styles.introTitle}>
                Emergency contact
              </Typography>
              <Typography
                variant="bodySmall"
                color="textSecondary"
                style={styles.introBody}
              >
                Who should we reach out to if something happens while you're
                training?
              </Typography>
            </View>

            {/* Red-tinted emergency card */}
            <View
              style={[
                styles.card,
                styles.emgCard,
                { borderColor: '#f3d3ce' },
              ]}
            >
              <View style={styles.cardHead}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3d3ce' },
                  ]}
                >
                  <Feather name="shield" size={18} color="#c2483c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="subtitle" style={styles.cardTitle}>
                    Emergency contact information
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Person to contact in case of emergency
                  </Typography>
                </View>
              </View>

              <Controller
                control={control}
                name="emergencyContact"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Contact name *"
                    placeholder="Enter full name"
                    value={value}
                    onChangeText={onChange}
                    error={errors.emergencyContact?.message}
                    containerStyle={styles.field}
                  />
                )}
              />

              <Controller
                control={control}
                name="emergencyPhone"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Contact number *"
                    placeholder="+91 XXXXX XXXXX"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="phone-pad"
                    error={errors.emergencyPhone?.message}
                    containerStyle={styles.field}
                  />
                )}
              />

              {/* Info note */}
              <View
                style={[
                  styles.emgNote,
                  { backgroundColor: theme.background },
                ]}
              >
                <Feather
                  name="info"
                  size={16}
                  color="#c2483c"
                  style={{ marginTop: 1, flexShrink: 0 }}
                />
                <View style={{ flex: 1 }}>
                  <Typography variant="bodySmallBold" style={{ marginBottom: 2 }}>
                    Why we ask
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    This person will be contacted immediately in case of a medical
                    emergency during training. Please make sure the details are
                    accurate and up to date.
                  </Typography>
                </View>
              </View>
            </View>

            <View style={styles.skipNote}>
              <Feather
                name="info"
                size={13}
                color={theme.textSecondary}
              />
              <Typography variant="caption" color="textSecondary">
                This is the last step before your profile is complete
              </Typography>
            </View>
          </View>
        )}

        {/* Bottom padding so content clears the footer */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Sticky footer nav ── */}
      <View
        style={[
          styles.footerNav,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom:
              Platform.OS === 'ios' ? Spacing.three : Spacing.two,
          },
        ]}
      >
        {step > 1 && (
          <Pressable
            onPress={onBack}
            style={[styles.ghostBtn, { borderColor: theme.border }]}
            hitSlop={8}
          >
            <Feather name="chevron-left" size={18} color={theme.text} />
          </Pressable>
        )}

        {isLastStep ? (
          <Button
            label="Complete profile"
            loading={isUpdating}
            onPress={handleSubmit(onSubmit)}
            style={styles.nextBtn}
          />
        ) : (
          <Button
            label="Continue"
            onPress={onNext}
            style={styles.nextBtn}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Top bar
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topbarTitles: { flex: 1, minWidth: 0 },
  topbarTitle: { fontWeight: '800', letterSpacing: -0.2 },
  stepPill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
    flexShrink: 0,
  },

  // Progress
  progressWrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.md,
    borderBottomWidth: 1,
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: Spacing.md,
  },
  progressSeg: {
    flex: 1,
    height: 5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    borderRadius: Radius.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    marginTop: -Spacing.one,
  },
  progressLabel: {
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 10,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.four },

  // Screen
  screenContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },

  // Intro
  intro: { gap: Spacing.one },
  introTitle: { fontWeight: '800', letterSpacing: -0.3 },
  introBody: { lineHeight: 20 },

  // Card
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  emgCard: {
    backgroundColor: '#fbeae7',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.two,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 2,
  },

  // Field / form
  field: {
    marginBottom: Spacing.two,
  },
  fieldLabel: {
    marginBottom: Spacing.one,
  },
  row2: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.two,
  },

  // Textarea
  textarea: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + 2,
    paddingBottom: Spacing.two + 2,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '600',
    fontSize: 10,
  },

  // Emergency note
  emgNote: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
  },

  // Skip note
  skipNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },

  // Footer
  footerNav: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  ghostBtn: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nextBtn: { flex: 1 },
  nextBtnFull: { flex: 1 },
});
