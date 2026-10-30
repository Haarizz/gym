import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Trans, useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { CurrencyGlyph, CurrencyValue } from '@/core/providers';
import { Radius, Spacing } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { roundMoney } from '../../../domain/paymentCalculations';
import { ChoiceChips } from './ChoiceChips';

interface SplitAmountPickerProps {
  label: string;
  total: number;
  value: number;
  onChange: (amount: number) => void;
  /** Quick picks as fractions of the total, e.g. [0, 0.25, 0.5, 0.75]. */
  presets: number[];
  /** Label for the 0 preset, e.g. "Nothing". */
  zeroLabel?: string;
}

/**
 * Picks part of the total — quick percentage chips, or an exact amount for when the
 * member hands over a specific sum. The only place the sheet asks for typing.
 */
export function SplitAmountPicker({ label, total, value, onChange, presets, zeroLabel }: SplitAmountPickerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | undefined>();

  const presetKey = (fraction: number) => String(fraction);
  const selectedPreset = presets.find((f) => Math.abs(roundMoney(total * f) - value) < 0.005 && !custom);

  return (
    <View style={styles.container}>
      <View style={[styles.display, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
        <Typography variant="caption" style={{ color: theme.textSecondary }}>
          {label}
        </Typography>
        <Typography variant="subtitle" style={[styles.value, { color: theme.text }]}>
          <CurrencyValue amount={value} decimals={2} />
        </Typography>
      </View>

      <ChoiceChips
        options={presets.map((fraction) => ({
          value: presetKey(fraction),
          label: fraction === 0 && zeroLabel ? zeroLabel : `${Math.round(fraction * 100)}%`,
        }))}
        value={selectedPreset !== undefined ? presetKey(selectedPreset) : null}
        onChange={(key) => {
          setCustom('');
          setError(undefined);
          onChange(roundMoney(total * Number(key)));
        }}
      />

      <Input
        label={<Trans i18nKey="paymentSheet.split.exactAmount" components={{ currency: <CurrencyGlyph /> }} />}
        value={custom}
        onChangeText={(text) => {
          const cleaned = text.replace(/[^0-9.]/g, '');
          setCustom(cleaned);
          const num = parseFloat(cleaned);
          if (!cleaned || Number.isNaN(num)) {
            setError(undefined);
            return;
          }
          if (num > total) {
            setError(t('paymentSheet.errors.amountTooHigh'));
            return;
          }
          setError(undefined);
          onChange(roundMoney(num));
        }}
        keyboardType="decimal-pad"
        placeholder="0.00"
        error={error}
      />
      <Typography variant="caption" style={{ color: theme.textSecondary }}>
        <Trans i18nKey="paymentSheet.split.ofTotal" components={{ amount: <CurrencyValue amount={total} decimals={2} /> }} />
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  display: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.three,
  },
  value: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
