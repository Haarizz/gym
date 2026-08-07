import { View, StyleSheet, ScrollView } from 'react-native';
import { Surface } from '@/shared/components/Surface';
import { FormSection } from '@/shared/components/FormSection';
import { Spacing } from '@/core/theme';

import { VisitorInformationSection } from './VisitorInformationSection';
import { DailyPlanSelector } from './DailyPlanSelector';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentSummaryCard } from './PaymentSummaryCard';
import { WalkInActionBar } from './WalkInActionBar';

import { useWalkInForm } from '../../hooks/useWalkInForm';

export function WalkInForm() {
  const {
    fullName, setFullName,
    phone, setPhone,
    photoUri, setPhotoUri,
    selectedPlanId, setSelectedPlanId,
    paymentMethod, setPaymentMethod,
    handleRegister, isSubmitting, reset
  } = useWalkInForm();

  return (
    <Surface style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <VisitorInformationSection 
          fullName={fullName}
          onChangeFullName={setFullName}
          phone={phone}
          onChangePhone={setPhone}
          photoUri={photoUri}
          onPhotoChange={setPhotoUri}
        />
        
        <FormSection title="Access Plan & Payment">
          <View style={styles.row}>
            <DailyPlanSelector selectedPlanId={selectedPlanId} onSelect={setSelectedPlanId} />
            <PaymentMethodSelector method={paymentMethod} onSelect={setPaymentMethod} />
          </View>
          
          <PaymentSummaryCard 
            price={154} 
            validityText="Valid for 26 monthly" 
            isPaid={true} 
          />
        </FormSection>

        <WalkInActionBar 
          onCancel={reset}
          onCollectPayment={() => {}}
          onGrantAccess={handleRegister}
          isLoading={isSubmitting}
        />
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.four,
  }
});
