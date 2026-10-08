// Health Risk Assessment Utility
// Calculates health risk levels based on member health data

export type HealthRiskLevel = 'low' | 'medium' | 'high';

export interface HealthData {
  medical_conditions?: string;
  allergies?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

// High-risk medical conditions
const highRiskConditions = [
  'heart disease',
  'cardiac',
  'diabetes',
  'hypertension',
  'asthma',
  'epilepsy',
  'seizure',
  'stroke',
  'copd',
  'hemophilia',
  'severe allergy',
  'anaphylaxis',
];

// Medium-risk conditions
const mediumRiskConditions = [
  'mild asthma',
  'controlled diabetes',
  'anxiety',
  'depression',
  'arthritis',
  'back pain',
  'knee injury',
];

/**
 * Calculate health risk level for a member
 * @param healthData Member's health information
 * @returns HealthRiskLevel: 'low', 'medium', or 'high'
 */
export function calculateHealthRisk(healthData: HealthData): HealthRiskLevel {
  if (!healthData) return 'low';

  const medicalConditions = (healthData.medical_conditions || '').toLowerCase();
  const allergies = (healthData.allergies || '').toLowerCase();
  const medications = (healthData.current_medications || '').toLowerCase();

  // No health concerns reported
  if (!medicalConditions && !allergies && !medications) {
    return 'low';
  }

  // Check for high-risk conditions
  const hasHighRiskCondition = highRiskConditions.some(condition =>
    medicalConditions.includes(condition) ||
    allergies.includes(condition) ||
    medications.includes(condition)
  );

  if (hasHighRiskCondition) {
    return 'high';
  }

  // Check for medium-risk conditions
  const hasMediumRiskCondition = mediumRiskConditions.some(condition =>
    medicalConditions.includes(condition)
  );

  // Count number of conditions
  const conditionCount = [
    medicalConditions.split(',').filter(c => c.trim()).length,
    allergies.split(',').filter(a => a.trim()).length,
    medications.split(',').filter(m => m.trim()).length,
  ].reduce((a, b) => a + b, 0);

  // Multiple conditions = higher risk
  if (hasMediumRiskCondition || conditionCount >= 3) {
    return 'medium';
  }

  // Some conditions but not high/medium risk
  if (conditionCount > 0) {
    return 'medium';
  }

  return 'low';
}

/**
 * Get risk badge configuration
 * @param riskLevel The calculated risk level
 * @returns Badge styling configuration
 */
export function getRiskBadgeConfig(riskLevel: HealthRiskLevel) {
  const configs = {
    high: {
      label: 'HIGH RISK',
      className: 'bg-accent text-white',
      icon: '🚨',
      description: 'Multiple or critical health conditions requiring extra attention'
    },
    medium: {
      label: 'MEDIUM RISK',
      className: 'bg-yellow-500 text-white',
      icon: '⚠️',
      description: 'Some health conditions requiring monitoring'
    },
    low: {
      label: 'LOW RISK',
      className: 'bg-green-600 text-white',
      icon: '✅',
      description: 'No major reported health concerns'
    }
  };

  return configs[riskLevel];
}

/**
 * Format health data for emergency display
 * @param healthData Member's health information
 * @returns Formatted emergency data
 */
export function formatEmergencyData(healthData: HealthData) {
  return {
    medicalConditions: healthData.medical_conditions || 'None reported',
    allergies: healthData.allergies || 'None reported',
    medications: healthData.current_medications || 'None reported',
    emergencyContact: healthData.emergency_contact_name || 'Not provided',
    emergencyPhone: healthData.emergency_contact_phone || 'Not provided',
  };
}
