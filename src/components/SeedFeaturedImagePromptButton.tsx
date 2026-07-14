"use client";

import { AsyncActionButton } from "@/components/AsyncActionButton";

export function SeedFeaturedImagePromptButton() {
  return (
    <AsyncActionButton
      endpoint="/api/developer-tools/seed-featured-image-prompt"
      idleLabel="Seed Featured Image Prompt"
      loadingLabel="Seeding..."
      successTitle="Featured image prompt seeded"
      successDescription="Prompt Studio now has an active featured_image prompt."
      errorTitle="Prompt seeding failed"
      defaultErrorMessage="Unable to seed the featured image prompt."
      variant="secondary"
    />
  );
}
