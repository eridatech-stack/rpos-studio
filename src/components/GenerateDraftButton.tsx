"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function GenerateDraftButton({
  articleId,
}: {
  articleId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/articles/generate-draft"
      body={{ articleId }}
      idleLabel="Generate Draft"
      loadingLabel="Generating Draft..."
      successTitle="Draft generated"
      successDescription="The article draft has been generated successfully."
      errorTitle="Draft generation failed"
      defaultErrorMessage="Failed to generate the article draft."
    />
  );
}