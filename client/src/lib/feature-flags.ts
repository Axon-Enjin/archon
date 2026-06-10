function normalizeBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export function isAiEnabled(): boolean {
  return normalizeBoolean(process.env.ARCHON_AI_ENABLED, true);
}

export function isM365Enabled(): boolean {
  return normalizeBoolean(process.env.ARCHON_M365_ENABLED, true);
}

export function isPowerAutomateFreeEnabled(): boolean {
  return normalizeBoolean(process.env.ARCHON_POWER_AUTOMATE_FREE_ENABLED, false);
}

/**
 * Shared secret used to authenticate the server-to-server Power Automate
 * delivery callback (PRD-F11). When unset, the callback endpoint is disabled.
 */
export function getPowerAutomateCallbackSecret(): string | undefined {
  const value = process.env.ARCHON_PA_CALLBACK_SECRET;
  return value && value.trim().length > 0 ? value : undefined;
}
