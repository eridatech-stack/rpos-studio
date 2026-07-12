"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function PublishApprovedArticleButton({
  articleId,
}: {
  articleId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/editorial/publish"
      body={{ articleId }}
      idleLabel="🌐 Publish Now"
      loadingLabel="Publishing..."
      successTitle="Article published"
      successDescription="The article is now publicly available on WordPress."
      errorTitle="Publishing failed"
      defaultErrorMessage="Unable to publish this article."
      confirmMessage="Publish this article publicly on WordPress?"
      variant="success"
      successToastDuration={12000}
      errorToastDuration={15000}
    />
  );
}