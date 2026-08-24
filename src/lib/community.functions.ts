/**
 * Server-Funktionen der Community-Ebene.
 * Dünne Hülle: Logik in community.ts, Datenzugriff in community.server.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import {
  confirmInputSchema,
  reportInputSchema,
  statusInputSchema,
  statusesInputSchema,
  type ContributionResult,
} from "./community-input";
import type { CommunityStatus } from "./community";

/** Preis melden (keine Nähe-Pflicht, aber Rate-Limit). */
export const reportPrice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reportInputSchema.parse(input))
  .handler(async ({ data }): Promise<ContributionResult> => {
    const { RATE_LIMITS, coarsen, containsBlockedWords } = await import("./community");
    const { actedRecently, insertReport, overDailyLimit } = await import(
      "./community.server"
    );

    const comment = data.comment?.trim() ?? "";
    if (comment && containsBlockedWords(comment)) {
      return { ok: false, reason: "invalid_input" };
    }

    try {
      if (await overDailyLimit(data.contributorId, RATE_LIMITS.perDay)) {
        return { ok: false, reason: "rate_limited" };
      }
      if (
        await actedRecently(
          "price_reports",
          data.contributorId,
          data.stationId,
          data.fuelType,
          RATE_LIMITS.perStationFuelHours,
        )
      ) {
        return { ok: false, reason: "rate_limited" };
      }

      await insertReport({
        station_id: data.stationId,
        fuel_type: data.fuelType,
        contributor_id: data.contributorId,
        reported_price: data.reportedPrice ?? null,
        comment: comment ? comment.slice(0, 200) : null,
        user_lat: typeof data.lat === "number" ? coarsen(data.lat) : null,
        user_lng: typeof data.lng === "number" ? coarsen(data.lng) : null,
      });
      return { ok: true };
    } catch (error) {
      console.error("reportPrice failed", error);
      return { ok: false, reason: "unknown" };
    }
  });

/** Preis bestätigen (nur in ~500 m Umkreis der Station). */
export const confirmPrice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => confirmInputSchema.parse(input))
  .handler(async ({ data }): Promise<ContributionResult> => {
    const { RATE_LIMITS, coarsen, isNearStation } = await import("./community");
    const { actedRecently, insertConfirmation, overDailyLimit, stationCoords } =
      await import("./community.server");

    try {
      const coords = await stationCoords(data.stationId);
      if (!coords) return { ok: false, reason: "invalid_input" };
      if (!isNearStation({ lat: data.lat, lng: data.lng }, coords)) {
        return { ok: false, reason: "too_far" };
      }
      if (await overDailyLimit(data.contributorId, RATE_LIMITS.perDay)) {
        return { ok: false, reason: "rate_limited" };
      }
      if (
        await actedRecently(
          "price_confirmations",
          data.contributorId,
          data.stationId,
          data.fuelType,
          RATE_LIMITS.perStationFuelHours,
        )
      ) {
        return { ok: false, reason: "rate_limited" };
      }

      await insertConfirmation({
        station_id: data.stationId,
        fuel_type: data.fuelType,
        contributor_id: data.contributorId,
        user_lat: coarsen(data.lat),
        user_lng: coarsen(data.lng),
      });
      return { ok: true };
    } catch (error) {
      console.error("confirmPrice failed", error);
      return { ok: false, reason: "unknown" };
    }
  });

/** Community-Status einer einzelnen Station. */
export const getCommunityStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => statusInputSchema.parse(input))
  .handler(async ({ data }): Promise<CommunityStatus> => {
    const { buildStatus } = await import("./community");
    const { readActivity } = await import("./community.server");
    const activity = await readActivity([data.stationId], data.fuelType);
    return buildStatus(
      data.stationId,
      data.fuelType,
      activity.confirmations.get(data.stationId) ?? [],
      activity.reports.get(data.stationId) ?? [],
    );
  });

/** Community-Status für die sichtbare Liste (zwei Abfragen statt N). */
export const getCommunityStatuses = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => statusesInputSchema.parse(input))
  .handler(async ({ data }): Promise<CommunityStatus[]> => {
    const { buildStatus } = await import("./community");
    const { readActivity } = await import("./community.server");
    const activity = await readActivity(data.stationIds, data.fuelType);
    return data.stationIds.map((id) =>
      buildStatus(
        id,
        data.fuelType,
        activity.confirmations.get(id) ?? [],
        activity.reports.get(id) ?? [],
      ),
    );
  });
