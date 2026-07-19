"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function GenerateDraftButton({
  articleId,
  regenerate = false,
  published = false,
}: {
  articleId: string;
  regenerate?: boolean;
  published?: boolean;
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
      confirmMessage={
        published
          ? "Regenerate the local text for this published article? The live WordPress post will not change until you update it."
          : undefined
      }
      variant={regenerate ? "secondary" : "primary"}
    />
  );
}
