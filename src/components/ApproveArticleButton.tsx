"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function ApproveArticleButton({
  articleId,
  disabled = false,
}: {
  articleId: string;
  disabled?: boolean;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/editorial/approve"
      body={{ articleId }}
      idleLabel="✓ Approve for Publishing"
      loadingLabel="Approving..."
      successTitle="Article approved"
      successDescription="The article was moved to the publishing queue."
      errorTitle="Approval failed"
      defaultErrorMessage="Unable to approve this article."
      variant="success"
      disabled={disabled}
    />
  );
}
