export type TicketStatus = "open" | "in_progress" | "blocked" | "done";
export type TicketType = "maintenance" | "renovation" | "housekeeping";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type HousekeepingStatus = "dirty" | "in_progress" | "clean" | "inspected";
export type SubtaskStatus = "not_started" | "in_progress" | "done" | "blocked" | "skipped";
export type PropertyStatus = "planned" | "under_construction" | "active" | "inactive";
export type PropertyType = "room" | "dorm_bed" | "unit";

export interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
}

export interface Property {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  housekeeping_status: HousekeepingStatus;
  status: PropertyStatus;
  property_type: PropertyType;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  has_kitchen: boolean;
  has_living_room: boolean;
  notes: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  auth_id: string | null;
  business_id: string;
  email: string;
  name: string;
  role: string;
  skills: string[] | null;
  created_at: string;
}

export interface IssueLabel {
  id: string;
  business_id: string;
  ticket_type: TicketType;
  label_name: string;
}

export interface Ticket {
  id: string;
  business_id: string;
  property_id: string;
  title: string;
  description: string | null;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  label_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  property?: Property;
  assigned_staff?: { name: string } | null;
  label?: { id: string; label_name: string } | null;
}

export interface TicketSubtask {
  id: string;
  ticket_id: string;
  title: string;
  status: SubtaskStatus;
  sequence_order: number;
  depends_on: string | null;
  assigned_to: string | null;
  notes: string | null;
  skip_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  dependency?: TicketSubtask | null;
  assigned_staff?: { name: string } | null;
}

export interface TicketPhoto {
  id: string;
  ticket_id: string;
  subtask_id: string | null;
  storage_path: string;
  url: string | null;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  subtask_id: string | null;
  user_id: string | null;
  action: string;
  note: string | null;
  created_at: string;
  user?: { name: string } | null;
}

export interface HousekeepingTask {
  id: string;
  property_id: string;
  title: string | null;
  notes: string | null;
  status: HousekeepingStatus;
  assigned_to: string | null;
  last_updated_by: string | null;
  last_updated_at: string;
  due_date: string | null;
  created_at: string;
}

export type ChecklistItemStatus = "not_started" | "done";

export interface HousekeepingChecklistItem {
  id: string;
  housekeeping_task_id: string;
  title: string;
  sequence_order: number;
  status: ChecklistItemStatus;
}

export type TenancyStatus = "current" | "upcoming" | "past";

export interface Tenant {
  id: string;
  business_id: string;
  property_id: string;
  tenant_name: string;
  check_in_date: string;
  check_out_date: string;
  status: TenancyStatus;
  notes: string | null;
  created_at: string;
  // joined
  property?: Pick<Property, "id" | "name" | "address" | "housekeeping_status"> | null;
}

export interface Notification {
  id: string;
  business_id: string;
  recipient_id: string;
  type: string;
  reference_table: string;
  reference_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export type SupplyRunStatus = "needed" | "ordered" | "delivered";

export interface SupplyRun {
  id: string;
  ticket_id: string;
  business_id: string;
  description: string;
  supplier: string | null;
  vehicle: string | null;
  status: SupplyRunStatus;
  needed_by_date: string | null;
  fulfilled_by: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  fulfilled_by_user?: { name: string } | null;
}

export interface Shift {
  id: string;
  business_id: string;
  app_user_id: string;
  property_id: string | null;
  ticket_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
  // joined
  staff?: { name: string } | null;
  property?: { id: string; name: string } | null;
  ticket?: { id: string; title: string } | null;
}

export interface ShiftCollision {
  property_name: string;
  staff_a: string;
  staff_b: string;
  time_a: string; // "HH:MM:SS-HH:MM:SS"
  time_b: string; // "HH:MM:SS-HH:MM:SS"
}

export interface GmReportSnapshot {
  id: string;
  business_id: string;
  property_id: string | null;
  snapshot_data: Record<string, unknown>;
  created_at: string;
}
