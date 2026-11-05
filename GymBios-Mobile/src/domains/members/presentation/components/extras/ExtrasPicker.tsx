import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { CurrencyValue } from '@/core/providers';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { toast } from '@/shared/components/Toasts/toastStore';
import {
  ADDON_CATEGORIES, FACILITY_RATE_TYPES, addonExtra, extrasApi, facilityExtra,
  type CatalogAddon, type CatalogFacility, type RegistrationExtra,
} from './extrasApi';

/**
 * Pick an add-on plan or a facility rate (with quantity) and hand it to `onPick`. With
 * `quickAdd`, a new add-on or facility can be created on the spot (it's saved to the catalogue).
 */
export function ExtrasPicker({ onPick, quickAdd = true, chosen = [] }: {
  onPick: (extra: RegistrationExtra) => void;
  quickAdd?: boolean;
  /** Already on the list — each add-on / facility can be added once (remove it to change it). */
  chosen?: RegistrationExtra[];
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [plans, setPlans] = useState<CatalogAddon[]>([]);
  const [facilities, setFacilities] = useState<CatalogFacility[]>([]);
  const [planId, setPlanId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [rateType, setRateType] = useState('');
  const [qty, setQty] = useState('1');
  const [sheet, setSheet] = useState<null | 'addon' | 'facility'>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([extrasApi.addonPlans().catch(() => []), extrasApi.facilities().catch(() => [])])
      .then(([p, f]) => { if (alive) { setPlans(p); setFacilities(f); } });
    return () => { alive = false; };
  }, []);

  const chosenPlans = new Set(chosen.filter((e) => e.kind === 'addon').map((e) => Number(e.addonPlanId)));
  const chosenFacilities = new Set(chosen.filter((e) => e.kind === 'facility').map((e) => Number(e.facilityId)));
  const planOptions = plans.filter((p) => !chosenPlans.has(Number(p.id)));
  const facilityOptions = facilities.filter((f) => !chosenFacilities.has(Number(f.id)));

  const facility = facilities.find((f) => f.id === facilityId);
  const rateOptions = useMemo(
    () => Object.entries(facility?.rates ?? {}).map(([r, price]) => ({ label: `${r} — ${price}`, value: r })),
    [facility],
  );
  useEffect(() => {
    if (!facility) { setRateType(''); return; }
    const keys = Object.keys(facility.rates);
    setRateType(keys.includes('Per Month') ? 'Per Month' : keys[0] ?? '');
  }, [facilityId, facilities]);

  const addPlan = () => {
    const p = plans.find((x) => String(x.id) === planId);
    if (!p || chosenPlans.has(Number(p.id))) return;
    onPick(addonExtra(p));
    setPlanId('');
  };
  const addFacility = () => {
    if (!facility || !rateType || chosenFacilities.has(Number(facility.id))) return;
    onPick(facilityExtra(facility, rateType, Number(qty)));
    setFacilityId('');
    setQty('1');
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.box, { borderColor: theme.border }]}>
        <View style={styles.boxHead}>
          <View style={styles.boxTitle}>
            <Feather name="package" size={15} color={BrandColors.teal} />
            <Typography variant="body" style={styles.bold}>{t('members.extras.addon')}</Typography>
          </View>
          {quickAdd && <QuickAddChip label={t('members.extras.quickAdd')} onPress={() => setSheet('addon')} />}
        </View>
        <Dropdown
          placeholder={!plans.length ? t('members.extras.noAddons')
            : planOptions.length ? t('members.extras.chooseAddon') : t('members.extras.allAddonsAdded')}
          value={planId}
          options={planOptions.map((p) => ({ label: `${p.name} — ${p.price} · ${t('members.extras.days', { count: p.validity })}`, value: String(p.id) }))}
          onChange={setPlanId}
          disabled={planOptions.length === 0}
        />
        <Button title={t('members.extras.add')} variant="outline" onPress={addPlan} disabled={!planId} />
      </View>

      <View style={[styles.box, { borderColor: theme.border }]}>
        <View style={styles.boxHead}>
          <View style={styles.boxTitle}>
            <Feather name="home" size={15} color={BrandColors.teal} />
            <Typography variant="body" style={styles.bold}>{t('members.extras.facility')}</Typography>
          </View>
          {quickAdd && <QuickAddChip label={t('members.extras.quickAdd')} onPress={() => setSheet('facility')} />}
        </View>
        <Dropdown
          placeholder={!facilities.length ? t('members.extras.noFacilities')
            : facilityOptions.length ? t('members.extras.chooseFacility') : t('members.extras.allFacilitiesAdded')}
          value={facilityId}
          options={facilityOptions.map((f) => ({ label: f.name, value: f.id }))}
          onChange={setFacilityId}
          disabled={facilityOptions.length === 0}
        />
        {facility && (
          <>
            <View style={styles.row}>
              <View style={styles.grow}>
                <Dropdown label={t('members.extras.rate')} value={rateType} options={rateOptions} onChange={setRateType} />
              </View>
              <View style={styles.qty}>
                <Input label={t('members.extras.quantity')} value={qty} onChangeText={setQty} keyboardType="number-pad" />
              </View>
            </View>
            <Typography variant="caption" color="textSecondary">{t('members.extras.quantityHint')}</Typography>
            <Button title={t('members.extras.add')} variant="outline" onPress={addFacility} disabled={!rateType} />
          </>
        )}
      </View>

      {quickAdd && (
        <>
          <QuickAddAddonSheet visible={sheet === 'addon'} onClose={() => setSheet(null)}
            onCreated={(p) => { setPlans((prev) => [...prev, p]); onPick(addonExtra(p)); }} />
          <QuickAddFacilitySheet visible={sheet === 'facility'} onClose={() => setSheet(null)}
            onCreated={(f, rate) => { setFacilities((prev) => [...prev, f]); onPick(facilityExtra(f, rate, 1)); }} />
        </>
      )}
    </View>
  );
}

/** The chosen lines with their prices and a remove button. */
export function ExtrasList({ extras, onRemove }: { extras: RegistrationExtra[]; onRemove?: (key: string) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (extras.length === 0) {
    return <Typography variant="caption" color="textSecondary">{t('members.extras.empty')}</Typography>;
  }
  const total = extras.reduce((s, e) => s + e.price, 0);
  return (
    <View style={styles.list}>
      {extras.map((e) => (
        <View key={e.key} style={[styles.item, { backgroundColor: theme.backgroundSelected }]}>
          <Feather name={e.kind === 'addon' ? 'package' : 'home'} size={15} color={BrandColors.teal} />
          <View style={styles.grow}>
            <Typography variant="body" numberOfLines={1} style={styles.bold}>{e.name}</Typography>
            <Typography variant="caption" color="textSecondary">{e.category} · {t('members.extras.days', { count: e.days })}</Typography>
          </View>
          <CurrencyValue amount={e.price} style={styles.bold} />
          {onRemove && (
            <Pressable onPress={() => onRemove(e.key)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${t('members.extras.remove')} ${e.name}`}>
              <Feather name="x" size={16} color={BrandColors.danger} />
            </Pressable>
          )}
        </View>
      ))}
      <View style={styles.totalRow}>
        <Typography variant="body">{t('members.extras.total')}</Typography>
        <CurrencyValue amount={total} style={styles.bold} />
      </View>
    </View>
  );
}

function QuickAddChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Feather name="plus" size={12} color={BrandColors.teal} />
      <Typography variant="caption" style={{ color: BrandColors.teal, fontWeight: '700' }}>{label}</Typography>
    </Pressable>
  );
}

function QuickAddAddonSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (p: CatalogAddon) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [validity, setValidity] = useState('30');
  const [category, setCategory] = useState('Other');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (visible) { setName(''); setPrice(''); setValidity('30'); setCategory('Other'); } }, [visible]);

  const save = async () => {
    if (!name.trim() || !(Number(price) > 0)) { toast.error(t('members.extras.saveFailed')); return; }
    setSaving(true);
    try {
      const p = await extrasApi.createAddonPlan({ name: name.trim(), price: Number(price), validity: Math.max(1, Number(validity) || 30), category });
      toast.success(t('members.extras.created', { name: p.name }));
      onCreated(p);
      onClose();
    } catch {
      // apiClient already toasts the server's reason.
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBottomSheet visible={visible} title={t('members.extras.quickAddAddonTitle')} onClose={onClose}
      footer={<Button title={t('members.extras.create')} onPress={save} loading={saving} size="lg" />}>
      <View style={styles.form}>
        <Input label={t('members.extras.name')} value={name} onChangeText={setName} />
        <Input label={t('members.extras.price')} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        <Input label={t('members.extras.validityDays')} value={validity} onChangeText={setValidity} keyboardType="number-pad" />
        <Dropdown label={t('members.extras.category')} value={category} options={ADDON_CATEGORIES.map((c) => ({ label: c, value: c }))} onChange={setCategory} />
      </View>
    </AppBottomSheet>
  );
}

function QuickAddFacilitySheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (f: CatalogFacility, rate: string) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [rateType, setRateType] = useState('Per Month');
  const [rate, setRate] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (visible) { setName(''); setRateType('Per Month'); setRate(''); setCapacity('20'); } }, [visible]);

  const save = async () => {
    if (!name.trim() || !(Number(rate) > 0)) { toast.error(t('members.extras.saveFailed')); return; }
    setSaving(true);
    try {
      const f = await extrasApi.createFacility({ name: name.trim(), rateType, rate: Number(rate), capacity: Math.max(1, Number(capacity) || 1) });
      toast.success(t('members.extras.created', { name: f.name }));
      onCreated(f, rateType);
      onClose();
    } catch {
      // apiClient already toasts the server's reason.
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppBottomSheet visible={visible} title={t('members.extras.quickAddFacilityTitle')} onClose={onClose}
      footer={<Button title={t('members.extras.create')} onPress={save} loading={saving} size="lg" />}>
      <View style={styles.form}>
        <Input label={t('members.extras.name')} value={name} onChangeText={setName} />
        <Dropdown label={t('members.extras.rate')} value={rateType} options={FACILITY_RATE_TYPES.map((r) => ({ label: r, value: r }))} onChange={setRateType} />
        <Input label={t('members.extras.price')} value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
        <Input label={t('members.extras.capacity')} value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  box: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.two },
  boxHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  bold: { fontWeight: '600' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.two, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1, borderStyle: 'dashed', borderColor: BrandColors.teal,
  },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
  grow: { flex: 1, minWidth: 0 },
  qty: { width: 90 },
  list: { gap: Spacing.one },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.one },
  form: { gap: Spacing.md },
});
