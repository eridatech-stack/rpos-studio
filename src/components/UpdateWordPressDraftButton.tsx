"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function UpdateWordPressDraftButton({
  articleId,
  published = false,
}: {
  articleId: string;
  published?: boolean;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/articles/update-wordpress-draft"
      body={{ articleId }}
      idleLabel={
        published
          ? "Update Live Article"
          : "Update WordPress Draft"
      }
      loadingLabel="Updating WordPress..."
      successTitle={
        published
          ? "Live article updated"
          : "WordPress draft updated"
      }
      successDescription={
        published
          ? "The latest local article edits and image settings were synced to the published WordPress post."
          : "The latest article edits and image settings were synced to WordPress."
      }
      errorTitle="WordPress update failed"
      defaultErrorMessage={
        published
          ? "Unable to update the live WordPress article."
          : "Unable to update the WordPress draft."
      }
      confirmMessage={
        published
          ? "Update the published WordPress article with the latest local content, SEO, category, and featured image?"
          : "Update the existing WordPress draft with the latest local article content, SEO, category, and featured image?"
      }
      variant="primary"
      errorToastDuration={20000}
    />
  );
}
