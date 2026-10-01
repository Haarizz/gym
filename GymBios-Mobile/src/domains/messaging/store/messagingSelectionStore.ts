import { create } from 'zustand';

import type { MessagingRecipient } from '../domain/MessagingModels';

/**
 * Hands the recipients picked on RecipientSelectionScreen to ComposeMessageScreen.
 * Full recipient objects (not just keys) are kept so compose can show names and
 * phone numbers without refetching.
 */
interface MessagingSelectionState {
  selectedRecipients: MessagingRecipient[];
  setSelectedRecipients: (recipients: MessagingRecipient[]) => void;
  clearSelectedRecipients: () => void;
}

export const useMessagingSelectionStore = create<MessagingSelectionState>((set) => ({
  selectedRecipients: [],
  setSelectedRecipients: (recipients) => set({ selectedRecipients: recipients }),
  clearSelectedRecipients: () => set({ selectedRecipients: [] }),
}));
