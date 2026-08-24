/**
 * Geplanter Sammellauf: holt aktuelle Preise für bekannte Stationen
 * und schreibt nur Änderungen in die Historie.
 *
 * Schutzmechanismen: Single-Flight-Lock, festes Batch-Limit pro Lauf,
 * rotierender Cursor und Circuit-Breaker bei Quota-Fehlern.
 */
import { createFileRoute } from "@tanstack/react-router";

const BATCH_SIZE = 100;
const MAX_BATCHES = 10;

export const Route = createFileRoute("/api/public/cron/collect-prices")({
  server: {
    handlers: {
      POST: async () => {
        const store = await import("@/lib/price-history.server");
        const { fetchPrices, TankerkoenigError } = await import(
          "@/lib/tankerkoenig.server"
        );

        let lease: Awaited<ReturnType<typeof store.acquireLease>>;
        try {
          lease = await store.acquireLease();
        } catch (error) {
          console.error("collect-prices: lease failed", error);
          return Response.json({ ok: false, error: "lease" }, { status: 500 });
        }

        if (!lease.acquired) {
          console.log("collect-prices: skipped, run already in progress");
          return Response.json({ ok: true, skipped: "locked" });
        }

        const paused = lease.state?.status === "paused";
        // Im pausierten Zustand nur eine einzige Sonde, um Erholung zu erkennen.
        const maxBatches = paused ? 1 : MAX_BATCHES;
        let cursor = lease.state?.cursor ?? null;
        let inserted = 0;
        let checked = 0;

        try {
          for (let batch = 0; batch < maxBatches; batch++) {
            let ids = await store.collectablePool(BATCH_SIZE, cursor);
            if (ids.length === 0 && cursor) {
              cursor = null;
              ids = await store.collectablePool(BATCH_SIZE, null);
            }
            if (ids.length === 0) break;

            const updates = await fetchPrices(ids);
            const snapshots = Object.entries(updates).map(([stationId, entry]) => ({
              stationId,
              prices: entry.prices,
            }));
            const known = await store.lastKnownPrices(ids);
            inserted += await store.insertHistoryRows(
              store.diffRows(snapshots, known),
            );
            checked += ids.length;
            cursor = ids[ids.length - 1] ?? cursor;
            if (ids.length < BATCH_SIZE) {
              cursor = null;
              break;
            }
          }

          await store.releaseLease({ status: "idle", cursor });
          console.log(
            `collect-prices: checked ${checked} stations, inserted ${inserted} rows`,
          );
          return Response.json({ ok: true, checked, inserted, resumed: paused });
        } catch (error) {
          const quota =
            error instanceof TankerkoenigError &&
            (error.kind === "quota" || error.kind === "missing-key");
          const message = error instanceof Error ? error.message : String(error);
          console.error("collect-prices failed", message);
          await store.releaseLease({
            status: quota ? "paused" : "idle",
            cursor,
            lastError: message,
          });
          return Response.json(
            { ok: false, paused: quota, error: message },
            { status: quota ? 429 : 500 },
          );
        }
      },
    },
  },
});
