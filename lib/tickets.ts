import { createClient } from '@/lib/supabase/client';
import { type TicketType, type TicketPriority, type Ticket } from '@/lib/types/database';

export interface NewTicketInput {
  businessId: string;
  propertyId: string;
  title: string;
  description?: string | null;
  type: TicketType;
  priority: TicketPriority;
  createdBy: string;
  assignedTo?: string | null;
}

export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const supabase = createClient();

  const { data: ticket, error } = await supabase.rpc('create_ticket_with_subtasks', {
    p_business_id: input.businessId,
    p_property_id: input.propertyId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_type: input.type,
    p_priority: input.priority,
    p_created_by: input.createdBy,
    p_assigned_to: input.assignedTo ?? null,
  });

  if (error) throw error;
  return ticket;
}
