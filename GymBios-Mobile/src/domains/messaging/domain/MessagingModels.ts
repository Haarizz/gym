export interface MessagingRecipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  membershipStatus?: string;
  membershipPlan?: string;
  membershipExpiry?: Date;
  lastVisit?: Date;
  location?: string;
  tags: string[];
  avatar?: string;
  joinDate?: Date;
  isVip?: boolean;
}

export interface MessageTemplate {
  id: number;
  name: string;
  category: string;
  subject: string;
  content: string;
  type: string;
  variables: string[];
  createdBy: string;
  createdDate: Date;
  usageCount: number;
  active?: boolean;
}

export interface MessageTemplateRequest {
  name: string;
  category: string;
  subject: string;
  content: string;
  type: string;
  variables: string[];
  active?: boolean;
}

export interface MessageGroup {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  members: string[];
  criteria: any;
  createdBy: string;
  createdDate: Date;
  isSystem: boolean;
}

export interface MessageGroupRequest {
  name: string;
  description: string;
  criteria: any;
  members: string[];
  system?: boolean;
}

export interface MessageHistory {
  id: string;
  subject: string;
  content: string;
  type: string;
  status: string;
  recipientCount: number;
  recipients: string[];
  sentDate: Date;
  scheduledDate?: Date;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  sentBy: string;
  cost: number;
}

export interface MessagingAnalytics {
  sentToday: number;
  scheduledMessages: number;
  totalRecipients: number;
  openRate: number;
  clickRate: number;
  totalCost: number;
}

export interface MessageRecipientSelection {
  id: string;
  type: string;
}

export interface SendMessageRequest {
  type: string;
  subject: string;
  content: string;
  recipients: MessageRecipientSelection[];
  groupIds?: string[];
  personalization?: boolean;
  scheduledAt?: Date;
  templateId?: number;
}

export interface SendMessageResponse {
  campaignId: string;
  status: string;
  recipientCount: number;
}
