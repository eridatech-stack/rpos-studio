"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function SeedKeywordPackPromptsButton() {
  return (
    <AsyncActionButton
      endpoint="/api/developer-tools/seed-keyword-pack-prompts"
      idleLabel="Seed Keyword Pack Prompts"
      loadingLabel="Seeding..."
      successTitle="Keyword pack prompts seeded"
      successDescription="Prompt Studio now has active keyword-pack generation prompts."
      errorTitle="Prompt seeding failed"
      defaultErrorMessage="Unable to seed the keyword-pack prompts."
      variant="secondary"
    />
  );
}
