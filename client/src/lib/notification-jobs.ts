import { cosmosDbService } from "@/lib/db/cosmos";
import { NotificationJobDoc } from "@/lib/db/types";
import {
  canPublishToPowerAutomateFree,
  publishNotificationJobToPowerAutomateFree,
} from "@/lib/power-automate-free";

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
  const job = await cosmosDbService.createNotificationJob({
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

  if (!canPublishToPowerAutomateFree()) {
    return job;
  }

  try {
    const published = await publishNotificationJobToPowerAutomateFree(job);
    const updated = await cosmosDbService.updateNotificationJobStatus(job.id, job.institution_id, {
      status: "processing",
      provider_message_id: published.listItemId,
      error_message: undefined,
      attempts: job.attempts + 1,
    });
    return updated || job;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Power Automate outbox publish failed.";
    const failed = await cosmosDbService.updateNotificationJobStatus(job.id, job.institution_id, {
      status: "failed",
      error_message: message,
      attempts: job.attempts + 1,
    });
    return failed || job;
  }
}

export async function enqueueOutlookNotification(input: OutlookNotificationInput): Promise<NotificationJobDoc> {
  const now = new Date().toISOString();
  const job = await cosmosDbService.createNotificationJob({
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

  if (!canPublishToPowerAutomateFree()) {
    return job;
  }

  try {
    const published = await publishNotificationJobToPowerAutomateFree(job);
    const updated = await cosmosDbService.updateNotificationJobStatus(job.id, job.institution_id, {
      status: "processing",
      provider_message_id: published.listItemId,
      error_message: undefined,
      attempts: job.attempts + 1,
    });
    return updated || job;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Power Automate outbox publish failed.";
    const failed = await cosmosDbService.updateNotificationJobStatus(job.id, job.institution_id, {
      status: "failed",
      error_message: message,
      attempts: job.attempts + 1,
    });
    return failed || job;
  }
}
