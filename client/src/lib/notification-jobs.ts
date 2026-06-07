import { cosmosDbService } from "@/lib/db/cosmos";
import { NotificationJobDoc } from "@/lib/db/types";

export interface TeamsNotificationInput {
  institutionId: string;
  recipientEntraOid: string;
  title: string;
  message: string;
  actionUrl?: string;
  ticketId?: string;
}

export interface OutlookNotificationInput {
  institutionId: string;
  recipientEntraOid: string;
  recipientEmail?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  ticketId?: string;
}

export async function enqueueTeamsNotification(input: TeamsNotificationInput): Promise<NotificationJobDoc> {
  const now = new Date().toISOString();
  return cosmosDbService.createNotificationJob({
    id: `notifjob-teams-${crypto.randomUUID()}`,
    institution_id: input.institutionId,
    channel: "teams",
    recipient_entra_oid: input.recipientEntraOid,
    status: "pending",
    attempts: 0,
    payload: {
      title: input.title,
      message: input.message,
      action_url: input.actionUrl,
      ticket_id: input.ticketId,
    },
    created_at: now,
    updated_at: now,
  });
}

export async function enqueueOutlookNotification(input: OutlookNotificationInput): Promise<NotificationJobDoc> {
  const now = new Date().toISOString();
  return cosmosDbService.createNotificationJob({
    id: `notifjob-outlook-${crypto.randomUUID()}`,
    institution_id: input.institutionId,
    channel: "outlook",
    recipient_entra_oid: input.recipientEntraOid,
    recipient_email: input.recipientEmail,
    status: "pending",
    attempts: 0,
    payload: {
      subject: input.subject,
      text_body: input.textBody,
      html_body: input.htmlBody,
      ticket_id: input.ticketId,
    },
    created_at: now,
    updated_at: now,
  });
}
