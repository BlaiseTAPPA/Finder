import { fetchApi } from "./server-fn-client";
import type {
  ConfirmInput,
  ContributionResult,
  ReportInput,
  StatusInput,
  StatusesInput,
} from "./community-input";
import type { CommunityStatus } from "./community";

/** Preis melden. */
export async function reportPrice(args: { data: ReportInput }): Promise<ContributionResult> {
  return fetchApi<ContributionResult>("/api/community/report", args.data);
}

/** Preis bestätigen. */
export async function confirmPrice(args: { data: ConfirmInput }): Promise<ContributionResult> {
  return fetchApi<ContributionResult>("/api/community/confirm", args.data);
}

/** Community-Status einer einzelnen Station. */
export async function getCommunityStatus(args: { data: StatusInput }): Promise<CommunityStatus> {
  return fetchApi<CommunityStatus>("/api/community/status", args.data);
}

/** Community-Status für die sichtbare Liste. */
export async function getCommunityStatuses(args: {
  data: StatusesInput;
}): Promise<CommunityStatus[]> {
  return fetchApi<CommunityStatus[]>("/api/community/statuses", args.data);
}
