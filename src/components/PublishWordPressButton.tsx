"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function PublishWordPressButton({
  articleId,
}: {
  articleId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/articles/publish-wordpress-draft"
      body={{ articleId }}
      idleLabel="Publish to WordPress Draft"
      loadingLabel="Creating WordPress Draft..."
      successTitle="WordPress draft created"
      successDescription="The article was sent to WordPress successfully."
      errorTitle="WordPress draft failed"
      defaultErrorMessage="Unable to create the WordPress draft."
      variant="success"
    />
  );
}