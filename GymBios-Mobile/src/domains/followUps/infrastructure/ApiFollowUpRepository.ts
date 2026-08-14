import type { FollowUpRepository } from '../application/FollowUpRepository';
import type { CommunicationRecord, FollowUp } from '../domain/FollowUp';
import type { FollowUpFilters } from '../domain/FollowUpFilters';
import type { FollowUpPageResponse } from '../domain/FollowUpPageResponse';
import type {
  AddCommunicationRecordRequest,
  CompleteFollowUpRequest,
  FollowUpRequest,
  RescheduleFollowUpRequest,
} from '../domain/FollowUpRequest';
import type { FollowUpStats } from '../domain/FollowUpStats';

import { apiClient } from '@/core/network/apiClient';

export class ApiFollowUpRepository implements FollowUpRepository {
  async getFollowUps(filters?: FollowUpFilters): Promise<FollowUpPageResponse> {
    const params: Record<string, string | number | undefined> = {};
    if (filters?.page !== undefined) params.page = filters.page;
    if (filters?.size !== undefined) params.size = filters.size;
    if (filters?.status) params.status = filters.status;
    if (filters?.type) params.type = filters.type;
    if (filters?.priority) params.priority = filters.priority;
    if (filters?.assignedStaff) params.assignedStaff = filters.assignedStaff;
    if (filters?.search) params.search = filters.search;

    const response = await apiClient.get<any>('/follow-ups', {
      params,
    });

    const data = response.data || {};
    const rawList: any[] = data.follow_ups ?? data.followUps ?? [];
    const p = data.pagination || {};

    return {
      followUps: rawList.map(item => this.toFollowUpDomain(item)),
      pagination: {
        page: p.page ?? 1,
        limit: p.limit ?? 20,
        total: p.total ?? 0,
        totalPages: p.total_pages ?? p.totalPages ?? 0,
      },
    };
  }

  async getStats(): Promise<FollowUpStats> {
    const response = await apiClient.get<any>('/follow-ups/stats');
    const d = response.data || {};

    return {
      totalFollowUps: d.total_follow_ups ?? d.totalFollowUps ?? 0,
      pendingFollowUps: d.pending_follow_ups ?? d.pendingFollowUps ?? 0,
      overdueFollowUps: d.overdue_follow_ups ?? d.overdueFollowUps ?? 0,
      completedFollowUps: d.completed_follow_ups ?? d.completedFollowUps ?? 0,
      cancelledFollowUps: d.cancelled_follow_ups ?? d.cancelledFollowUps ?? 0,
      rescheduledFollowUps: d.rescheduled_follow_ups ?? d.rescheduledFollowUps ?? 0,
      completionRate: d.completion_rate ?? d.completionRate ?? 0,
    };
  }

  async getById(id: number): Promise<FollowUp> {
    const response = await apiClient.get<any>(`/follow-ups/${id}`);
    return this.toFollowUpDomain(response.data);
  }

  async create(request: FollowUpRequest): Promise<FollowUp> {
    const response = await apiClient.post<any>(
      '/follow-ups',
      this.toApiPayload(request),
    );
    return this.toFollowUpDomain(response.data);
  }

  async update(id: number, request: FollowUpRequest): Promise<FollowUp> {
    const response = await apiClient.put<any>(
      `/follow-ups/${id}`,
      this.toApiPayload(request),
    );
    return this.toFollowUpDomain(response.data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/follow-ups/${id}`);
  }

  async complete(id: number, request: CompleteFollowUpRequest): Promise<FollowUp> {
    const response = await apiClient.post<any>(
      `/follow-ups/${id}/complete`,
      {
        outcome: request.outcome,
        notes: request.notes,
      },
    );
    return this.toFollowUpDomain(response.data);
  }

  async cancel(id: number): Promise<FollowUp> {
    const response = await apiClient.post<any>(
      `/follow-ups/${id}/cancel`,
    );
    return this.toFollowUpDomain(response.data);
  }

  async reschedule(
    id: number,
    request: RescheduleFollowUpRequest,
  ): Promise<FollowUp> {
    const response = await apiClient.post<any>(
      `/follow-ups/${id}/reschedule`,
      {
        dueDate: request.dueDate,
        due_date: request.dueDate,
      },
    );
    return this.toFollowUpDomain(response.data);
  }

  async markOverdue(): Promise<void> {
    await apiClient.post('/follow-ups/mark-overdue');
  }

  async addRecord(
    id: number,
    record: AddCommunicationRecordRequest,
  ): Promise<CommunicationRecord> {
    const response = await apiClient.post<any>(
      `/follow-ups/${id}/records`,
      {
        type: record.type,
        date: record.date,
        staffMember: record.staffMember,
        staff_member: record.staffMember,
        duration: record.duration,
        outcome: record.outcome,
        notes: record.notes,
        nextAction: record.nextAction,
        next_action: record.nextAction,
      },
    );
    return this.toRecordDomain(response.data);
  }

  async deleteRecord(recordId: number): Promise<void> {
    await apiClient.delete(`/follow-ups/records/${recordId}`);
  }

  private toApiPayload(request: FollowUpRequest): Record<string, any> {
    return {
      leadId: request.leadId,
      lead_id: request.leadId,
      type: request.type,
      status: request.status,
      priority: request.priority,
      assignedStaff: request.assignedStaff,
      assigned_staff: request.assignedStaff,
      dueDate: request.dueDate,
      due_date: request.dueDate,
      scheduledTime: request.scheduledTime,
      scheduled_time: request.scheduledTime,
      completedDate: request.completedDate,
      completed_date: request.completedDate,
      subject: request.subject,
      notes: request.notes,
      tags: request.tags,
      membershipStatus: request.membershipStatus,
      membership_status: request.membershipStatus,
      membershipPlan: request.membershipPlan,
      membership_plan: request.membershipPlan,
      followUpReason: request.followUpReason,
      follow_up_reason: request.followUpReason,
      estimatedDuration: request.estimatedDuration,
      estimated_duration: request.estimatedDuration,
      outcome: request.outcome,
    };
  }

  private toFollowUpDomain(item: any): FollowUp {
    if (!item) {
      return {
        id: 0,
        followUpId: '',
        leadId: 0,
        leadName: '',
        type: 'call',
        status: 'pending',
        priority: 'medium',
        dueDate: '',
        subject: '',
        tags: [],
        communicationHistory: [],
      };
    }

    const rawRecords: any[] = item.communication_history ?? item.communicationHistory ?? [];

    return {
      id: item.id,
      followUpId: item.follow_up_id ?? item.followUpId ?? '',
      leadId: item.lead_id ?? item.leadId ?? 0,
      leadName: item.lead_name ?? item.leadName ?? '',
      leadEmail: item.lead_email ?? item.leadEmail ?? undefined,
      leadPhone: item.lead_phone ?? item.leadPhone ?? undefined,
      type: item.type ?? 'call',
      status: item.status ?? 'pending',
      priority: item.priority ?? 'medium',
      assignedStaff: item.assigned_staff ?? item.assignedStaff ?? undefined,
      dueDate: item.due_date ?? item.dueDate ?? '',
      scheduledTime: item.scheduled_time ?? item.scheduledTime ?? undefined,
      completedDate: item.completed_date ?? item.completedDate ?? undefined,
      subject: item.subject ?? '',
      notes: item.notes ?? undefined,
      tags: item.tags ?? [],
      membershipStatus: item.membership_status ?? item.membershipStatus ?? undefined,
      membershipPlan: item.membership_plan ?? item.membershipPlan ?? undefined,
      followUpReason: item.follow_up_reason ?? item.followUpReason ?? undefined,
      estimatedDuration: item.estimated_duration ?? item.estimatedDuration ?? undefined,
      outcome: item.outcome ?? undefined,
      communicationHistory: rawRecords.map(r => this.toRecordDomain(r)),
      createdAt: item.created_at ?? item.createdAt ?? undefined,
      updatedAt: item.updated_at ?? item.updatedAt ?? undefined,
    };
  }

  private toRecordDomain(item: any): CommunicationRecord {
    if (!item) {
      return {
        id: 0,
        type: 'call',
        date: new Date().toISOString(),
        staffMember: '',
        outcome: 'successful',
        notes: '',
      };
    }

    return {
      id: item.id,
      type: item.type ?? 'call',
      date: item.date ?? item.created_at ?? item.createdAt ?? new Date().toISOString(),
      staffMember: item.staff_member ?? item.staffMember ?? '',
      duration: item.duration ?? undefined,
      outcome: item.outcome ?? 'successful',
      notes: item.notes ?? '',
      nextAction: item.next_action ?? item.nextAction ?? undefined,
    };
  }
}
