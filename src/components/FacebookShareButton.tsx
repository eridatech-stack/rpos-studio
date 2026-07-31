"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function FacebookShareButton({
  articleId,
}: {
  articleId: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/social/facebook/share"
      body={{ articleId }}
      idleLabel="Prepare Facebook Post"
      loadingLabel="Preparing..."
      successTitle="Facebook post prepared"
      successDescription="The Facebook post was added to Social Distribution."
      errorTitle="Facebook post failed"
      defaultErrorMessage="Unable to prepare Facebook post."
      confirmMessage="Prepare a Facebook post for this published article?"
      variant="secondary"
    />
  );
}
