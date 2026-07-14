"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function RetryProductionRunButton({
  productionRunId,
}: {
  productionRunId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/production/runs/retry"
      body={{ productionRunId }}
      idleLabel="Retry Run"
      loadingLabel="Retrying..."
      successTitle="Production run queued"
      successDescription="The failed run was returned to the worker queue."
      errorTitle="Retry failed"
      defaultErrorMessage="Unable to retry this production run."
      confirmMessage="Retry this failed production run?"
      variant="secondary"
    />
  );
}
