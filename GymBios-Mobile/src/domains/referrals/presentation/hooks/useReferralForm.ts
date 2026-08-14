import { useState, useCallback } from 'react';
import type { Referral } from '../../domain/Referral';
import type { CreateReferralPayload, UpdateReferralPayload } from '../../domain/ReferralPayloads';

export interface NewReferralFormState {
  referrerMemberId: string;
  referrerName: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone: string;
  date: string;
  status: string;
  notes: string;
  ruleId: string;
  referralCode: string;
}

export function useReferralForm() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewSheet, setShowViewSheet] = useState(false);
  const [qrCodeLink, setQrCodeLink] = useState<string | null>(null);

  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  const initialFormState: NewReferralFormState = {
    referrerMemberId: '',
    referrerName: '',
    refereeName: '',
    refereeEmail: '',
    refereePhone: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: '',
    ruleId: 'auto',
    referralCode: '',
  };

  const [formState, setFormState] = useState<NewReferralFormState>(initialFormState);

  const openAdd = useCallback(() => {
    setFormState(initialFormState);
    setShowAddModal(true);
  }, []);

  const closeAdd = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const openEdit = useCallback((referral: Referral) => {
    setSelectedReferral(referral);
    setFormState({
      referrerMemberId: referral.referrerMemberId || '',
      referrerName: referral.referrerName || '',
      refereeName: referral.refereeName || '',
      refereeEmail: referral.refereeEmail || '',
      refereePhone: referral.refereePhone || '',
      date: referral.date || referral.createdAt || new Date().toISOString().split('T')[0],
      status: referral.status || 'pending',
      notes: referral.notes || '',
      ruleId: referral.ruleId ? String(referral.ruleId) : 'auto',
      referralCode: referral.referralCode || '',
    });
    setShowEditModal(true);
  }, []);

  const closeEdit = useCallback(() => {
    setShowEditModal(false);
    setSelectedReferral(null);
  }, []);

  const openView = useCallback((referral: Referral) => {
    setSelectedReferral(referral);
    setShowViewSheet(true);
  }, []);

  const closeView = useCallback(() => {
    setShowViewSheet(false);
    setSelectedReferral(null);
  }, []);

  const openQrModal = useCallback((link: string) => {
    setQrCodeLink(link);
  }, []);

  const closeQrModal = useCallback(() => {
    setQrCodeLink(null);
  }, []);

  return {
    showAddModal,
    showEditModal,
    showViewSheet,
    qrCodeLink,
    selectedReferral,
    formState,
    setFormState,
    openAdd,
    closeAdd,
    openEdit,
    closeEdit,
    openView,
    closeView,
    openQrModal,
    closeQrModal,
  };
}
