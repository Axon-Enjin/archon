/**
 * Lightweight analytics event taxonomy (PRD §5.5).
 *
 * Emits structured lifecycle events at a single chokepoint so they can later be
 * shipped to Application Insights / Cosmos without touching call sites. For now
 * events are written to the server log as structured JSON (the roadmap allows a
 * console/Cosmos start), which keeps the metric definitions in one place and
 * makes the lifecycle observable in development.
 */

export type AnalyticsEventType =
  | "ticket_created"
  | "resolved_auto"
  | "escalated"
  | "staff_resolved"
  | "notification_enqueued"
  | "notification_delivered"
  | "notification_delivery_failed"
  | "satisfaction_submitted";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  institutionId: string;
  ticketId?: string;
  studentId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export function recordAnalyticsEvent(event: AnalyticsEvent): void {
  const payload = {
    kind: "analytics_event",
    ts: new Date().toISOString(),
    ...event,
  };
  // Single structured emission point — swap this for an App Insights / Cosmos
  // sink later without changing any call site.
  console.info(JSON.stringify(payload));
}
