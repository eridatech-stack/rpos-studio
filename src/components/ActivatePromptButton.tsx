"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function ActivatePromptButton({
  promptId,
}: {
  promptId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/prompts/activate"
      body={{ id: promptId }}
      idleLabel="Activate Version"
      loadingLabel="Activating..."
      successTitle="Prompt activated"
      successDescription="This prompt version is now active."
      errorTitle="Activation failed"
      defaultErrorMessage="Unable to activate this prompt version."
      variant="secondary"
    />
  );
}