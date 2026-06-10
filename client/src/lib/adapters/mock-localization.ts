import type { HoldItem } from "@/lib/adapters/types";

export type UserLanguage = "en" | "fil" | "ceb";

/**
 * Localizes generated hold reasons and disbursement labels (PRD-F6).
 *
 * The generator stores canonical English strings (so cached data stays
 * language-neutral and shared across surfaces). These helpers re-render the
 * variable parts (amounts, GWA) into fil/ceb at display time, where the user's
 * language is known — so chat output is localized end-to-end, not just the
 * response wrappers.
 */

/** Canonical disbursement status labels → localized variants. */
const DISBURSEMENT_STATUS_L10N: Record<string, { fil: string; ceb: string }> = {
  "Pending Verification": { fil: "Naghihintay ng Verification", ceb: "Naghulat sa Verification" },
  "Approved — Scheduled": { fil: "Aprubado — Naka-iskedyul", ceb: "Aprubado — Naka-iskedyul" },
  Processing: { fil: "Pinoproseso", ceb: "Gi-proseso" },
};

export function localizeDisbursementStatus(status: string, language: UserLanguage): string {
  if (language === "en") return status;
  const entry = DISBURSEMENT_STATUS_L10N[status];
  if (!entry) return status;
  return language === "fil" ? entry.fil : entry.ceb;
}

function extractAfter(text: string, marker: RegExp): string | null {
  const match = text.match(marker);
  return match ? match[1].trim() : null;
}

/** Localizes a generated hold's `reason` based on its type. */
export function localizeHoldReason(hold: HoldItem, language: UserLanguage): string {
  if (language === "en") return hold.reason;
  const type = hold.type.toLowerCase();

  if (type === "financial") {
    const amount = extractAfter(hold.reason, /balance of (.+)$/i) ?? "";
    return language === "fil"
      ? `May natitirang bayarin sa tuition na ${amount}`
      : `Naa pay nahabilin nga balanse sa tuition nga ${amount}`;
  }

  if (type === "academic") {
    const gwa = extractAfter(hold.reason, /GWA is ([0-9.]+)/i) ?? "";
    return language === "fil"
      ? `Kakulangan sa Satisfactory Academic Progress (SAP) — ang GWA mo ay ${gwa} (kailangang 2.50)`
      : `Kakulangan sa Satisfactory Academic Progress (SAP) — ang imong GWA kay ${gwa} (kinahanglan 2.50)`;
  }

  if (type === "administrative") {
    return language === "fil"
      ? "Kulang na requirement sa admission: hindi pa naisusumite ang Form 137 / Transcript of Records"
      : "Kulang nga requirement sa admission: wala pa ma-submit ang Form 137 / Transcript of Records";
  }

  return hold.reason;
}

/** Localizes a generated hold's `resolution_steps` for known categories. */
export function localizeHoldResolution(hold: HoldItem, language: UserLanguage): string {
  if (language === "en") return hold.resolution_steps;
  const type = hold.type.toLowerCase();

  if (type === "academic") {
    return language === "fil"
      ? "Magsumite ng SAP Appeal narrative at study plan sa Academic Advisory Panel."
      : "Pagsumite og SAP Appeal narrative ug study plan sa Academic Advisory Panel.";
  }

  if (type === "administrative") {
    return language === "fil"
      ? "Isumite ang orihinal na Form 137 sa Registrar's Office para ma-clear ang hold na ito."
      : "I-submit ang orihinal nga Form 137 sa Registrar's Office aron ma-clear kini nga hold.";
  }

  // Financial resolution steps are dynamic (depend on disbursement coverage);
  // leave them to the route's localized hold-lift / diagnosis messaging.
  return hold.resolution_steps;
}
