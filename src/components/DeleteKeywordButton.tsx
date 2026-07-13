"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function DeleteKeywordButton({
  keywordId,
  keyword,
}: {
  keywordId: string;
  keyword: string;
}) {
  return (
    <AsyncActionButton
      endpoint="/api/keywords/delete"
      body={{ keywordId }}
      idleLabel={<span aria-hidden="true">🗑️</span>}
      loadingLabel="…"
      successTitle="Keyword deleted"
      successDescription={`"${keyword}" was removed from the keyword library.`}
      errorTitle="Keyword could not be deleted"
      defaultErrorMessage="The keyword may be linked to an article or production run."
      confirmMessage={`Delete the keyword "${keyword}"?\n\nThis action cannot be undone.`}
      variant="danger"
      className="h-10 w-10 px-0 py-0 text-lg"
      successToastDuration={10000}
      errorToastDuration={15000}
    />
  );
}