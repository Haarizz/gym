import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { TextInput } from '@/shared/components/AppText';
import { GlassBlob, GlassSurface } from '@/shared/components';
import { toast } from '@/shared/components/Toasts/toastStore';
import { ApiError } from '@/core/platform/api/types';

import {
  ENQUIRY_CATEGORIES,
  ENQUIRY_MESSAGE_MAX_LENGTH,
  ENQUIRY_SUBJECT_MAX_LENGTH,
  MAX_OPEN_ENQUIRIES,
  type EnquiryCategory,
  type MemberEnquiry,
} from '../enquiriesApi';
import { useCreateEnquiry } from '../useMyEnquiries';
import { CategoryIcon, EnquiryColors as C } from './enquiryUi';

interface NewEnquiryViewProps {
  onBack: () => void;
  onCreated: (enquiry: MemberEnquiry) => void;
}

/** Topic, subject and details — the gym answers once, in the app. */
export function NewEnquiryView({ onBack, onCreated }: NewEnquiryViewProps) {
  const { t } = useTranslation();
  const createEnquiry = useCreateEnquiry();
  const [category, setCategory] = useState<EnquiryCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const canSubmit = !!category && !!subject.trim() && !!message.trim() && !createEnquiry.isPending;

  const submit = async () => {
    if (!category || !canSubmit) return;
    try {
      const created = await createEnquiry.mutateAsync({ category, subject: subject.trim(), message: message.trim() });
      toast.success(t('enquiries.submitted'));
      onCreated(created);
    } catch (e) {
      // Server errors (e.g. too many open enquiries) are already toasted by the API client.
      if (!(e instanceof ApiError) || !e.status) toast.error(t('enquiries.submitFailed'));
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlassBlob color={C.amber} size={320} opacity={0.28} top={-80} right={-120} />

      <View style={styles.bar}>
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={styles.roundWhite}
          accessibilityRole="button"
          accessibilityLabel={t('shared.goBack')}
        >
          <Feather name="chevron-left" size={20} color={C.ink} />
        </Pressable>
        <Typography style={styles.barTitle}>{t('enquiries.newEnquiry')}</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Typography style={styles.label}>{t('enquiries.categoryPrompt')}</Typography>
        <View style={styles.cats} accessibilityRole="radiogroup">
          {ENQUIRY_CATEGORIES.map((key) => {
            const on = key === category;
            return (
              <Pressable
                key={key}
                onPress={() => setCategory(key)}
                style={[styles.cat, on && styles.catOn]}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <CategoryIcon category={key} size={34} />
                <Typography style={styles.catText} numberOfLines={1}>{t(`enquiries.categories.${key}`)}</Typography>
              </Pressable>
            );
          })}
        </View>

        <Typography style={styles.label}>{t('enquiries.subject')}</Typography>
        <TextInput
          style={styles.field}
          value={subject}
          onChangeText={setSubject}
          maxLength={ENQUIRY_SUBJECT_MAX_LENGTH}
          placeholder={t('enquiries.subjectPlaceholder')}
          placeholderTextColor="#9b927f"
          accessibilityLabel={t('enquiries.subject')}
          returnKeyType="next"
        />

        <Typography style={styles.label}>{t('enquiries.message')}</Typography>
        <TextInput
          style={[styles.field, styles.textarea]}
          value={message}
          onChangeText={setMessage}
          maxLength={ENQUIRY_MESSAGE_MAX_LENGTH}
          placeholder={t('enquiries.messagePlaceholder')}
          placeholderTextColor="#9b927f"
          accessibilityLabel={t('enquiries.message')}
          multiline
          textAlignVertical="top"
        />
        <Typography style={styles.count}>{message.length}/{ENQUIRY_MESSAGE_MAX_LENGTH}</Typography>

        <View style={styles.hint}>
          <Feather name="info" size={16} color={C.blueInk} style={styles.hintIcon} />
          <Typography style={styles.hintText}>{t('enquiries.formHint', { count: MAX_OPEN_ENQUIRIES })}</Typography>
        </View>
      </ScrollView>

      <GlassSurface radius={26} strong style={styles.actionbar}>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          {createEnquiry.isPending ? <ActivityIndicator color="#fff" size="small" /> : null}
          <Typography style={styles.btnText}>
            {t(createEnquiry.isPending ? 'enquiries.submitting' : 'enquiries.submit')}
          </Typography>
        </Pressable>
      </GlassSurface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: 14 },
  roundWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: C.ink },
  form: { paddingHorizontal: Spacing.three, paddingBottom: 120 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: Spacing.two,
  },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    width: '23%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 18,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  catOn: { borderColor: C.amber, backgroundColor: '#FFFBF0' },
  catText: { fontSize: 11, fontWeight: '700', color: C.ink },
  field: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    height: 50,
    fontSize: 14,
    color: C.ink,
  },
  textarea: { height: 140, paddingTop: 12, paddingBottom: 12, lineHeight: 20 },
  count: { textAlign: 'right', fontSize: 11, fontWeight: '600', color: C.muted, marginTop: 4 },
  hint: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    backgroundColor: C.blueSoft,
  },
  hintIcon: { marginTop: 1 },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '600', color: C.blueInk },
  actionbar: { position: 'absolute', left: 12, right: 12, bottom: 14, padding: 10 },
  btn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
