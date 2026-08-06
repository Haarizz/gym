import { authService } from "./supabase/auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AutomationWorkflow {
  id: number;
  name: string;
  description: string;
  status: "active" | "paused" | "draft" | "error";
  triggerType: string;
  triggerParams: string; // JSON string
  targetType: "ALL" | "SEGMENT";
  targetParams: string; // JSON string
  actionType: string;
  actionTitle: string;
  actionContent: string;
  actionSubject: string;
  delayMinutes: number;
  frequency: "once" | "daily" | "weekly" | "monthly";
  executionTime: string | null; // "HH:mm"
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timezone: string;
  cooldownHours: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  membersEngaged: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface AutomationStats {
  total: number;
  active: number;
  paused: number;
  draft: number;
  error: number;
  totalRuns: number;
  membersEngaged: number;
}

export interface CreateWorkflowPayload {
  name: string;
  description?: string;
  status?: string;
  trigger_type: string;
  trigger_params?: string;
  target_type?: string;
  target_params?: string;
  action_type: string;
  action_title?: string;
  action_content?: string;
  action_subject?: string;
  delay_minutes?: number;
  frequency?: string;
  execution_time?: string;
  day_of_week?: number;
  day_of_month?: number;
  cooldown_hours?: number;
  priority?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapWorkflow(r: any): AutomationWorkflow {
  return {
    id: r.id,
    name: r.name ?? "",
    description: r.description ?? "",
    status: r.status ?? "draft",
    triggerType: r.triggerType ?? r.trigger_type ?? "",
    triggerParams: r.triggerParams ?? r.trigger_params ?? "{}",
    targetType: r.targetType ?? r.target_type ?? "ALL",
    targetParams: r.targetParams ?? r.target_params ?? "{}",
    actionType: r.actionType ?? r.action_type ?? "",
    actionTitle: r.actionTitle ?? r.action_title ?? "",
    actionContent: r.actionContent ?? r.action_content ?? "",
    actionSubject: r.actionSubject ?? r.action_subject ?? "",
    delayMinutes: r.delayMinutes ?? r.delay_minutes ?? 0,
    frequency: r.frequency ?? "once",
    executionTime: r.executionTime ?? r.execution_time ?? null,
    dayOfWeek: r.dayOfWeek ?? r.day_of_week ?? null,
    dayOfMonth: r.dayOfMonth ?? r.day_of_month ?? null,
    timezone: r.timezone ?? "Asia/Kolkata",
    cooldownHours: r.cooldownHours ?? r.cooldown_hours ?? 24,
    priority: r.priority ?? "MEDIUM",
    totalRuns: r.totalRuns ?? r.total_runs ?? 0,
    successfulRuns: r.successfulRuns ?? r.successful_runs ?? 0,
    failedRuns: r.failedRuns ?? r.failed_runs ?? 0,
    membersEngaged: r.membersEngaged ?? r.members_engaged ?? 0,
    lastRunAt: r.lastRunAt ?? r.last_run_at ?? null,
    nextRunAt: r.nextRunAt ?? r.next_run_at ?? null,
    isSystem: r.isSystem ?? r.is_system ?? false,
    createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updatedAt ?? r.updated_at ?? null,
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authService.makeAuthenticatedRequest(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── API client ────────────────────────────────────────────────────────────────

export const automationService = {
  async getAll(): Promise<AutomationWorkflow[]> {
    const data = await request<any[]>("/automations");
    return (data ?? []).map(mapWorkflow);
  },

  async getStats(): Promise<AutomationStats> {
    return request<AutomationStats>("/automations/stats");
  },

  async getById(id: number): Promise<AutomationWorkflow> {
    const data = await request<any>(`/automations/${id}`);
    return mapWorkflow(data);
  },

  async create(payload: CreateWorkflowPayload): Promise<AutomationWorkflow> {
    const data = await request<any>("/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return mapWorkflow(data);
  },

  async update(id: number, payload: Partial<CreateWorkflowPayload>): Promise<AutomationWorkflow> {
    const data = await request<any>(`/automations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return mapWorkflow(data);
  },

  async toggle(id: number): Promise<AutomationWorkflow> {
    const data = await request<any>(`/automations/${id}/toggle`, { method: "PUT" });
    return mapWorkflow(data);
  },

  async run(id: number): Promise<void> {
    await request(`/automations/${id}/run`, { method: "POST" });
  },

  async delete(id: number): Promise<void> {
    await request(`/automations/${id}`, { method: "DELETE" });
  },

  async getLogs(id: number, page = 0, size = 20): Promise<any[]> {
    const data = await request<any[]>(`/automations/${id}/logs?page=${page}&size=${size}`);
    return data ?? [];
  },

  /** Helper: convert UI builder form → API payload */
  buildPayload(form: {
    name: string;
    description: string;
    trigger: { type: string; parameters: Record<string, any> };
    action: {
      type: string;
      content: string;
      subject: string;
      delay: number;
      delayUnit: "minutes" | "hours" | "days";
    };
    frequency: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  }): CreateWorkflowPayload {
    const delayMinutes =
      form.action.delay *
      (form.action.delayUnit === "days" ? 1440 : form.action.delayUnit === "hours" ? 60 : 1);

    return {
      name: form.name,
      description: form.description,
      status: "active",
      trigger_type: form.trigger.type,
      trigger_params: JSON.stringify(form.trigger.parameters),
      target_type: "ALL",
      target_params: "{}",
      action_type: form.action.type,
      action_title: form.name,        // default title = workflow name
      action_content: form.action.content,
      action_subject: form.action.subject,
      delay_minutes: delayMinutes,
      frequency: form.frequency,
      ...(form.frequency === "weekly" ? { day_of_week: form.dayOfWeek } : {}),
      ...(form.frequency === "monthly" ? { day_of_month: form.dayOfMonth } : {}),
      priority: "MEDIUM",
      cooldown_hours: 24,
    };
  },
};
