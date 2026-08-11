import React from 'react';
import { useRouter } from 'expo-router';

import { BrandColors } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';

interface CommunityAnalyticsHeaderProps {
  onBack?: () => void;
}

export function CommunityAnalyticsHeader({ onBack }: CommunityAnalyticsHeaderProps) {
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
      title="Community Analytics"
      subtitle="Operational performance & engagement metrics"
      colors={[BrandColors.teal, '#0f766e']}
      onBack={handleBack}
    />
  );
}
