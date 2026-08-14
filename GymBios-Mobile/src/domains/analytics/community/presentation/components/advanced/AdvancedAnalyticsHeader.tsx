import React from 'react';
import { useRouter } from 'expo-router';

import { BrandColors } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';

interface AdvancedAnalyticsHeaderProps {
  onBack?: () => void;
}

export function AdvancedAnalyticsHeader({ onBack }: AdvancedAnalyticsHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <AppHeader
      title="Advanced Analytics"
      subtitle="Predictive insights, trainer stats & financial metrics"
      colors={[BrandColors.teal, '#0f766e']}
      onBack={handleBack}
    />
  );
}
