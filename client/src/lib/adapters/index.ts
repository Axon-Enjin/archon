import { MockUniversityAdapter } from "@/lib/adapters/mock-university-adapter";
import type { IUniversityAdapter } from "@/lib/adapters/types";

const adapterCache = new Map<string, IUniversityAdapter>();

function resolveAdapterClassName(): string {
  return (process.env.ARCHON_UNIVERSITY_ADAPTER_CLASS || "mock").trim().toLowerCase();
}

export function getUniversityAdapter(institutionId: string): IUniversityAdapter {
  const cacheKey = `${institutionId}:${resolveAdapterClassName()}`;
  const existing = adapterCache.get(cacheKey);
  if (existing) return existing;

  // For Milestone A we materialize the mock adapter through a stable resolver.
  // Additional adapter classes can be registered here without touching route code.
  const adapter = new MockUniversityAdapter();
  adapterCache.set(cacheKey, adapter);
  return adapter;
}
