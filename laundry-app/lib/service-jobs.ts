import type { LaundererServiceType } from "@/constants/launderers";

export type ServiceJob = "laundry" | "ironing" | "tailoring";

const JOB_TYPES: Record<ServiceJob, readonly LaundererServiceType[]> = {
  laundry: ["washAndFold", "dryCleaning"],
  ironing: ["press"],
  tailoring: ["tailoring"],
};

export function jobFromHomeService(value?: string | null): ServiceJob | null {
  if (value === "laundry" || value === "washAndFold" || value === "dryCleaning") {
    return "laundry";
  }
  if (value === "ironing" || value === "press") return "ironing";
  if (value === "tailoring") return "tailoring";
  return null;
}

export function parseServiceJob(
  value?: string | string[] | null,
): ServiceJob | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return jobFromHomeService(raw);
}

export function serviceTypesForJob(job: ServiceJob): readonly LaundererServiceType[] {
  return JOB_TYPES[job];
}

export function jobIncludesServiceType(
  job: ServiceJob,
  type: LaundererServiceType | null | undefined,
): boolean {
  if (!type) return false;
  return JOB_TYPES[job].includes(type);
}

export function offeredJobsFromTypes(types: readonly LaundererServiceType[]): ServiceJob[] {
  const jobs: ServiceJob[] = [];
  if (types.includes("washAndFold") || types.includes("dryCleaning")) jobs.push("laundry");
  if (types.includes("press")) jobs.push("ironing");
  if (types.includes("tailoring")) jobs.push("tailoring");
  return jobs;
}

export function defaultJobFromTypes(types: readonly LaundererServiceType[]): ServiceJob {
  return offeredJobsFromTypes(types)[0] ?? "laundry";
}

export function resolveActiveJob(
  types: readonly LaundererServiceType[],
  requested?: string | null,
): ServiceJob {
  const offered = offeredJobsFromTypes(types);
  const wanted = jobFromHomeService(requested);
  if (wanted && offered.includes(wanted)) return wanted;
  return offered[0] ?? "laundry";
}

export function primaryServiceForJob(
  job: ServiceJob,
  types: readonly LaundererServiceType[] = JOB_TYPES[job],
): LaundererServiceType {
  const allowed = JOB_TYPES[job];
  const match = allowed.find((type) => types.includes(type));
  return match ?? allowed[0];
}
