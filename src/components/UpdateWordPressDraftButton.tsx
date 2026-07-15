"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function UpdateWordPressDraftButton({
  articleId,
}: {
  articleId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/articles/update-wordpress-draft"
      body={{ articleId }}
      idleLabel="Update WordPress Draft"
      loadingLabel="Updating WordPress..."
      successTitle="WordPress draft updated"
      successDescription="The latest article edits and image settings were synced to WordPress."
      errorTitle="WordPress update failed"
      defaultErrorMessage="Unable to update the WordPress draft."
      confirmMessage="Update the existing WordPress draft with the latest local article content, SEO, category, and featured image?"
      variant="primary"
      errorToastDuration={20000}
    />
  );
}
