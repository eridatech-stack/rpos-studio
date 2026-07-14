"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function DeleteArticleButton({
  articleId,
  title,
}: {
  articleId: string;
  title: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/articles/delete"
      body={{ articleId }}
      idleLabel={<span aria-hidden="true">🗑️</span>}
      loadingLabel="…"
      successTitle="Article deleted"
      successDescription={`"${title}" was removed and its keyword was restored.`}
      errorTitle="Article could not be deleted"
      defaultErrorMessage="Published articles cannot be deleted."
      confirmMessage={`Delete the article "${title}"?\n\nThis removes the local draft, production run history, generated image records, and restores the keyword for editing or deletion.`}
      variant="danger"
      className="h-10 w-10 px-0 py-0 text-lg"
      successToastDuration={10000}
      errorToastDuration={15000}
    />
  );
}
