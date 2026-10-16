// Utility functions for managing referral rewards across GymBios

export interface ReferralReward {
  id: string;
  referrerId: string;
  referrerName: string;
  referredMemberId: string;
  referredMemberName: string;
  rewardAmount: number;
  status: 'pending' | 'earned' | 'redeemed';
  earnedDate: Date;
  redeemedDate?: Date;
  expiryDate: Date;
  ruleId: string;
  ruleName: string;
}

// Sample rewards storage (in production, this would be in your database)
let rewardsStorage: ReferralReward[] = [
  {
    id: 'RW001',
    referrerId: 'MB-1024',
    referrerName: 'John Mathew',
    referredMemberId: 'MB-2001',
    referredMemberName: 'Michael Brown',
    rewardAmount: 50,
    status: 'earned',
    earnedDate: new Date('2025-10-20'),
    expiryDate: new Date('2026-01-18'),
    ruleId: '1',
    ruleName: 'New Member Bonus'
  },
  {
    id: 'RW002',
    referrerId: 'MB-1025',
    referrerName: 'Sarah Johnson',
    rewardAmount: 75,
    status: 'earned',
    earnedDate: new Date('2025-10-25'),
    expiryDate: new Date('2026-01-23'),
    ruleId: '1',
    ruleName: 'Premium Referral Bonus',
    referredMemberId: 'MB-2002',
    referredMemberName: 'Emma Wilson'
  },
  {
    id: 'RW003',
    referrerId: 'GYM001',
    referrerName: 'John Smith',
    rewardAmount: 50,
    status: 'earned',
    earnedDate: new Date('2025-10-28'),
    expiryDate: new Date('2026-01-26'),
    ruleId: '1',
    ruleName: 'New Member Bonus',
    referredMemberId: 'MB-2003',
    referredMemberName: 'Alex Turner'
  }
];

/**
 * Get all unredeemed rewards for a specific member
 */
export function getUnredeemedRewards(memberId: string): ReferralReward[] {
  const now = new Date();
  return rewardsStorage.filter(
    reward => 
      reward.referrerId === memberId && 
      reward.status === 'earned' &&
      reward.expiryDate > now
  );
}

/**
 * Get the first available reward for a member (FIFO)
 */
export function getNextRewardForMember(memberId: string): ReferralReward | null {
  const rewards = getUnredeemedRewards(memberId);
  if (rewards.length === 0) return null;
  
  // Sort by earned date (oldest first) - FIFO
  rewards.sort((a, b) => a.earnedDate.getTime() - b.earnedDate.getTime());
  return rewards[0];
}

/**
 * Calculate total unredeemed reward amount for a member
 */
export function getTotalUnredeemedAmount(memberId: string): number {
  const rewards = getUnredeemedRewards(memberId);
  return rewards.reduce((total, reward) => total + reward.rewardAmount, 0);
}

/**
 * Mark a reward as redeemed
 */
export function markRewardAsRedeemed(rewardId: string): boolean {
  const reward = rewardsStorage.find(r => r.id === rewardId);
  if (!reward) return false;
  
  reward.status = 'redeemed';
  reward.redeemedDate = new Date();
  return true;
}

/**
 * Create a new reward when a referred member makes a payment
 */
export function createReward(params: {
  referrerId: string;
  referrerName: string;
  referredMemberId: string;
  referredMemberName: string;
  rewardAmount: number;
  ruleId: string;
  ruleName: string;
  expiryDays?: number;
}): ReferralReward {
  const now = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + (params.expiryDays || 90));

  const newReward: ReferralReward = {
    id: `RW${String(rewardsStorage.length + 1).padStart(3, '0')}`,
    referrerId: params.referrerId,
    referrerName: params.referrerName,
    referredMemberId: params.referredMemberId,
    referredMemberName: params.referredMemberName,
    rewardAmount: params.rewardAmount,
    status: 'earned',
    earnedDate: now,
    expiryDate: expiryDate,
    ruleId: params.ruleId,
    ruleName: params.ruleName
  };

  rewardsStorage.push(newReward);
  return newReward;
}

/**
 * Calculate reward based on rule (simplified example)
 */
export function calculateRewardAmount(
  membershipAmount: number,
  ruleType: 'fixed' | 'percentage',
  ruleValue: number
): number {
  if (ruleType === 'fixed') {
    return ruleValue;
  } else {
    return Math.round((membershipAmount * ruleValue) / 100);
  }
}

/**
 * Send reward notification via WhatsApp (simulated)
 */
export async function sendWhatsAppNotification(
  phone: string,
  referrerName: string,
  rewardAmount: number
): Promise<boolean> {
  const message = `🎉 Congratulations ${referrerName}! You've earned a reward of AED ${rewardAmount} for your successful referral. You can redeem it on your next membership renewal or add-on purchase. Valid for 90 days.`;
  
  console.log(`[WhatsApp] Sending to ${phone}: ${message}`);
  
  // In production, integrate with Twilio or similar service
  // For demo purposes, we'll just log it
  return true;
}

/**
 * Send reward notification via Email (simulated)
 */
export async function sendEmailNotification(
  email: string,
  referrerName: string,
  rewardAmount: number
): Promise<boolean> {
  const subject = '🎁 You\'ve Earned a Referral Reward!';
  const body = `
    Hi ${referrerName},
    
    Great news! You've earned a reward of AED ${rewardAmount} for successfully referring a new member to our gym.
    
    Your reward is now available and can be redeemed on your next:
    • Membership renewal
    • Add-on purchase
    • Plan upgrade
    
    This reward is valid for 90 days from today.
    
    Thank you for helping our gym community grow!
    
    Best regards,
    GymBios Team
  `;
  
  console.log(`[Email] Sending to ${email}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  
  // In production, integrate with your email service
  // For demo purposes, we'll just log it
  return true;
}

/**
 * Process referral completion and trigger reward
 */
export async function processReferralCompletion(params: {
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  referrerPhone: string;
  referredMemberId: string;
  referredMemberName: string;
  membershipAmount: number;
}): Promise<ReferralReward> {
  // Calculate reward (using default rule: AED 50 flat)
  const rewardAmount = 50;
  
  // Create reward entry
  const reward = createReward({
    referrerId: params.referrerId,
    referrerName: params.referrerName,
    referredMemberId: params.referredMemberId,
    referredMemberName: params.referredMemberName,
    rewardAmount: rewardAmount,
    ruleId: '1',
    ruleName: 'New Member Bonus',
    expiryDays: 90
  });
  
  // Send notifications
  await sendWhatsAppNotification(params.referrerPhone, params.referrerName, rewardAmount);
  await sendEmailNotification(params.referrerEmail, params.referrerName, rewardAmount);
  
  return reward;
}

/**
 * Apply reward to a transaction
 */
export function applyRewardToTransaction(params: {
  memberId: string;
  rewardId: string;
  transactionAmount: number;
}): { 
  rewardApplied: number; 
  finalAmount: number; 
  success: boolean;
  message: string;
} {
  const reward = rewardsStorage.find(r => r.id === params.rewardId);
  
  if (!reward) {
    return {
      rewardApplied: 0,
      finalAmount: params.transactionAmount,
      success: false,
      message: 'Reward not found'
    };
  }
  
  if (reward.referrerId !== params.memberId) {
    return {
      rewardApplied: 0,
      finalAmount: params.transactionAmount,
      success: false,
      message: 'Reward does not belong to this member'
    };
  }
  
  if (reward.status !== 'earned') {
    return {
      rewardApplied: 0,
      finalAmount: params.transactionAmount,
      success: false,
      message: 'Reward has already been redeemed or expired'
    };
  }
  
  // Apply the reward
  const rewardApplied = Math.min(reward.rewardAmount, params.transactionAmount);
  const finalAmount = Math.max(0, params.transactionAmount - rewardApplied);
  
  // Mark as redeemed
  markRewardAsRedeemed(params.rewardId);
  
  return {
    rewardApplied,
    finalAmount,
    success: true,
    message: 'Reward successfully applied'
  };
}

/**
 * Get all rewards for admin view
 */
export function getAllRewards(): ReferralReward[] {
  return rewardsStorage;
}

/**
 * Get reward statistics
 */
export function getRewardStatistics() {
  const totalRewards = rewardsStorage.length;
  const earnedRewards = rewardsStorage.filter(r => r.status === 'earned').length;
  const redeemedRewards = rewardsStorage.filter(r => r.status === 'redeemed').length;
  const totalAmount = rewardsStorage.reduce((sum, r) => sum + r.rewardAmount, 0);
  const redeemedAmount = rewardsStorage
    .filter(r => r.status === 'redeemed')
    .reduce((sum, r) => sum + r.rewardAmount, 0);
  const pendingAmount = rewardsStorage
    .filter(r => r.status === 'earned')
    .reduce((sum, r) => sum + r.rewardAmount, 0);
  
  return {
    totalRewards,
    earnedRewards,
    redeemedRewards,
    totalAmount,
    redeemedAmount,
    pendingAmount
  };
}
