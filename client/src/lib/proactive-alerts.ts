import { cosmosDbService } from "@/lib/db/cosmos";
import {
  generateCalendarEvents,
  generateStudentScenario,
  type GeneratedCalendarEvent,
} from "@/lib/adapters/mock-data-generator";
import type { FinancialStatus, HoldItem } from "@/lib/adapters/types";

export interface StudentSignals {
  holds: HoldItem[];
  financial: FinancialStatus;
  events: GeneratedCalendarEvent[];
}

/**
 * Deterministically resolves a student's current holds, financial status, and
 * upcoming calendar events for proactive scanning (PRD-F5).
 *
 * Reads cache first; when a signal is absent (e.g. the student has never logged
 * in), it generates the deterministic scenario and caches it. This lets the
 * proactive scan act on every known student — not just those who have already
 * opened Archon — which is the whole point of "proactive".
 */
export async function collectStudentSignals(
  studentOid: string,
  institutionId: string
): Promise<StudentSignals> {
  let holds = await cosmosDbService.getCacheData<HoldItem[]>(`holds:${studentOid}`, institutionId);
  let financial = await cosmosDbService.getCacheData<FinancialStatus>(
    `financial:${studentOid}`,
    institutionId
  );
  let events = await cosmosDbService.getCacheData<GeneratedCalendarEvent[]>(
    `calendar:${studentOid}`,
    institutionId
  );

  if (!holds || !financial) {
    const scenario = generateStudentScenario(studentOid);
    if (!holds) {
      holds = scenario.holds;
      await cosmosDbService.setCacheData(`holds:${studentOid}`, holds, institutionId);
    }
    if (!financial) {
      financial = scenario.financial;
      await cosmosDbService.setCacheData(`financial:${studentOid}`, financial, institutionId);
    }
  }

  if (!events) {
    events = generateCalendarEvents(studentOid);
    await cosmosDbService.setCacheData(`calendar:${studentOid}`, events, institutionId);
  }

  return { holds, financial, events };
}
