import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Feather from '@expo/vector-icons/Feather';

import { i18n, LANGUAGES, useLanguageStore, type LanguageCode } from '@/core/i18n';
import { Radius, Spacing } from '@/core/theme';
import { Text } from '@/shared/components/AppText';
import { GlassBlob } from '@/shared/components';

const INK = '#1f2433';
const INK_2 = '#4a5068';
const MUTED = '#8a90a6';
const AMBER = ['#f8d977', '#f4b54a'] as const;
const SELECTED = ['#fbe9b4', '#f6d37f'] as const;
const TEAL = ['#2f6e60', '#4b7a6f'] as const;
const SCREEN_BG = '#f3f4f8';
const GUTTER = 22;
const GAP = 14;

interface LanguageSelectScreenProps {
  /**
   * `onboarding`: first-run step after profile completion — "Continue".
   * `settings`: opened from Settings — back button and "Save".
   */
  mode: 'onboarding' | 'settings';
  /** Route reopened if switching to/from Arabic restarts the app. */
  resumeHref: string;
  /** Called once the choice is saved (not called when the app is reloading). */
  onDone: () => void;
  onBack?: () => void;
}

export function LanguageSelectScreen({ mode, resumeHref, onDone, onBack }: LanguageSelectScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const currentLanguage = useLanguageStore((s) => s.language);
  const chooseLanguage = useLanguageStore((s) => s.chooseLanguage);

  // Pre-selected: the saved language, or the device language on first run.
  const [selected, setSelected] = useState<LanguageCode>(currentLanguage);
  const [isSaving, setIsSaving] = useState(false);

  // Header and button preview the picked language before it's applied.
  const tPreview = useMemo(() => i18n.getFixedT(selected), [selected]);
  const isSettings = mode === 'settings';
  const isUnchanged = isSettings && selected === currentLanguage;
  const cardWidth = (Math.min(width, 600) - GUTTER * 2 - GAP) / 2;

  const handleConfirm = async () => {
    if (isSaving || isUnchanged) return;
    setIsSaving(true);
    try {
      const { reloading, restartRequired } = await chooseLanguage(selected, resumeHref);
      if (reloading) return;
      if (restartRequired) {
        Alert.alert(i18n.t('language.restartTitle'), i18n.t('language.restartBody'));
      }
      onDone();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <GlassBlob color={AMBER[0]} size={460} opacity={0.55} top={-200} right={-200} />
      <GlassBlob color={TEAL[1]} size={380} opacity={0.18} bottom={-160} left={-180} />

      <View style={styles.top}>
        {isSettings && onBack && (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn} accessibilityRole="button">
            <Feather name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={20} color={INK} />
          </Pressable>
        )}
        <LinearGradient colors={AMBER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.globe}>
          <Feather name="globe" size={26} color={INK} />
        </LinearGradient>
        <Animated.View key={selected} entering={FadeIn.duration(220)}>
          <Text style={styles.title} accessibilityRole="header">
            {tPreview('language.title')}
          </Text>
          <Text style={styles.sub}>
            {/* Non-English previews keep an English hint so the screen stays readable. */}
            {selected === 'en' ? tPreview('language.subtitle') : i18n.getFixedT('en')('language.title')}
          </Text>
        </Animated.View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.grid, { paddingBottom: 150 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        accessibilityRole="radiogroup"
      >
        {LANGUAGES.map((lang, index) => {
          const isSelected = lang.code === selected;
          return (
            <Animated.View
              key={lang.code}
              entering={FadeInDown.duration(450).delay(index * 60)}
              style={{ width: cardWidth }}
            >
              <Pressable
                onPress={() => setSelected(lang.code)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={lang.englishName}
                style={({ pressed }) => [
                  styles.card,
                  isSelected && styles.cardSelected,
                  pressed && styles.cardPressed,
                ]}
              >
                {isSelected && (
                  <LinearGradient
                    colors={SELECTED}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View>
                  <Text style={styles.name}>{lang.nativeName}</Text>
                  {lang.code !== 'en' && (
                    <Text style={[styles.englishName, isSelected && styles.englishNameSelected]}>
                      {lang.englishName}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.hello,
                    lang.hello.length > 6 && styles.helloLong,
                    isSelected && styles.helloSelected,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {lang.hello}
                </Text>
                <View style={[styles.tick, isSelected && styles.tickSelected]}>
                  {isSelected && <Feather name="check" size={14} color="#fff" />}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <LinearGradient
        colors={['rgba(243,244,248,0)', SCREEN_BG, SCREEN_BG]}
        locations={[0, 0.4, 1]}
        style={[styles.bar, { paddingBottom: 26 + insets.bottom }]}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={isSaving || isUnchanged}
          style={({ pressed }) => [
            styles.btnShadow,
            (isSaving || isUnchanged) && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
        >
          <LinearGradient colors={TEAL} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.btnText}>
                  {tPreview(isSettings ? 'language.save' : 'common.continue')}
                </Text>
                <Feather name={I18nManager.isRTL ? 'arrow-left' : 'arrow-right'} size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </Pressable>
        {!isSettings && <Text style={styles.note}>{tPreview('language.note')}</Text>}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SCREEN_BG,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  top: {
    paddingHorizontal: GUTTER,
    paddingTop: Spacing.four,
    paddingBottom: 18,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  globe: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: AMBER[1],
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: INK,
  },
  sub: {
    marginTop: Spacing.two,
    fontSize: 14.5,
    color: INK_2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: GUTTER,
    paddingTop: 6,
  },
  card: {
    height: 150,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: INK,
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardSelected: {
    borderColor: AMBER[1],
    shadowColor: AMBER[1],
    shadowOpacity: 0.9,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: INK,
    paddingEnd: 30,
  },
  englishName: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: MUTED,
  },
  englishNameSelected: {
    color: '#7a5d19',
  },
  hello: {
    alignSelf: 'flex-end',
    fontSize: 26,
    fontWeight: '700',
    color: '#c9cdd8',
  },
  helloLong: {
    fontSize: 21,
  },
  helloSelected: {
    color: '#4a3504',
  },
  tick: {
    position: 'absolute',
    top: 14,
    end: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#d3d6df',
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickSelected: {
    backgroundColor: TEAL[0],
    borderColor: TEAL[0],
  },
  bar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: GUTTER,
    paddingTop: Spacing.four,
  },
  btnShadow: {
    borderRadius: 18,
    shadowColor: TEAL[0],
    shadowOpacity: 0.8,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
  },
  btn: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  note: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12.5,
    color: MUTED,
  },
});
