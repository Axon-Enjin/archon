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
