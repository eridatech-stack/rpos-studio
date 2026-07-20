"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function StaleProductionRunActions({
  productionRunId,
}: {
  productionRunId: string;
}) {
  return (
    <>
      <AsyncActionButton
        endpoint="/api/production/runs/restart-stale"
        body={{ productionRunId }}
        idleLabel="Restart Stale Run"
        loadingLabel="Restarting..."
        successTitle="Stale run restarted"
        successDescription="The stale run was returned to the worker queue."
        errorTitle="Restart failed"
        defaultErrorMessage="Unable to restart this stale production run."
        confirmMessage="Restart this stale production run and let the worker continue unfinished steps?"
        variant="secondary"
      />

      <AsyncActionButton
        endpoint="/api/production/runs/remove-stale"
        body={{ productionRunId }}
        idleLabel="Remove Stale Run"
        loadingLabel="Removing..."
        successTitle="Stale run removed"
        successDescription="The stale production run was removed."
        errorTitle="Remove failed"
        defaultErrorMessage="Unable to remove this stale production run."
        confirmMessage="Remove this stale production run? This deletes the run history, steps, and timeline events, but does not delete articles or keywords."
        variant="danger"
        redirectTo="/production/runs"
      />
    </>
  );
}
