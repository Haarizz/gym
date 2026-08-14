import { MessagingRecipient } from '../domain/MessagingModels';

export const getRecipientKey = (recipient: MessagingRecipient): string => {
  return `${recipient.type}:${recipient.id}`;
};

export const normalizePhone = (phone: string): string => {
  return phone.replace(/[^\d]/g, '');
};

export const personalizeContent = (
  content: string,
  recipient: MessagingRecipient
): string => {
  let personalized = content;
  
  if (personalized.includes('{FirstName}')) {
    const firstName = recipient.name.split(' ')[0] || '';
    personalized = personalized.replace(/\{FirstName\}/g, firstName);
  }
  
  if (personalized.includes('{LastName}')) {
    const parts = recipient.name.split(' ');
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    personalized = personalized.replace(/\{LastName\}/g, lastName);
  }
  
  if (personalized.includes('{FullName}')) {
    personalized = personalized.replace(/\{FullName\}/g, recipient.name || '');
  }
  
  if (personalized.includes('{Email}')) {
    personalized = personalized.replace(/\{Email\}/g, recipient.email || '');
  }
  
  if (personalized.includes('{Phone}')) {
    personalized = personalized.replace(/\{Phone\}/g, recipient.phone || '');
  }
  
  if (personalized.includes('{MembershipPlan}')) {
    personalized = personalized.replace(/\{MembershipPlan\}/g, recipient.membershipPlan || '');
  }
  
  if (personalized.includes('{MembershipStatus}')) {
    personalized = personalized.replace(/\{MembershipStatus\}/g, recipient.membershipStatus || '');
  }

  return personalized;
};
