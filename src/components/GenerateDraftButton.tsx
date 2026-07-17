"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function GenerateDraftButton({
  articleId,
  regenerate = false,
}: {
  articleId: string;
  regenerate?: boolean;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/articles/generate-draft"
      body={{ articleId, regenerate }}
      idleLabel={regenerate ? "Regenerate Draft" : "Generate Draft"}
      loadingLabel={regenerate ? "Regenerating Draft..." : "Generating Draft..."}
      successTitle={regenerate ? "Draft regenerated" : "Draft generated"}
      successDescription={
        regenerate
          ? "The local article draft was regenerated. Review it before syncing to WordPress."
          : "The article draft has been generated successfully."
      }
      errorTitle="Draft generation failed"
      defaultErrorMessage="Failed to generate the article draft."
      variant={regenerate ? "secondary" : "primary"}
    />
  );
}
