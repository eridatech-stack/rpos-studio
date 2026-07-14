"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function GenerateFeaturedImageButton({
  articleId,
}: {
  articleId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/articles/generate-featured-image"
      body={{ articleId }}
      idleLabel="Generate Featured Image"
      loadingLabel="Generating Image..."
      successTitle="Featured image attached"
      successDescription="The generated image was uploaded and set on the WordPress draft."
      errorTitle="Image generation failed"
      defaultErrorMessage="Unable to generate and attach a featured image."
      confirmMessage="Generate a new featured image and attach it to this WordPress draft?"
      variant="secondary"
      errorToastDuration={20000}
    />
  );
}
