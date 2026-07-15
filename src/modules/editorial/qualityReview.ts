export type QualityReviewChecks = {
  draftReviewed: boolean;
  factualAccuracy: boolean;
  seoMetadata: boolean;
  linksReviewed: boolean;
  imageReviewed: boolean;
  wordpressPreview: boolean;
};

export type QualityReviewState = {
  checks: QualityReviewChecks;
  notes: string;
  updatedAt: string | null;
};

const defaultChecks: QualityReviewChecks = {
  draftReviewed: false,
  factualAccuracy: false,
  seoMetadata: false,
  linksReviewed: false,
  imageReviewed: false,
  wordpressPreview: false,
};

export function getDefaultQualityReview(): QualityReviewState {
  return {
    checks: {
      ...defaultChecks,
    },
    notes: "",
    updatedAt: null,
  };
}

export function parseQualityReview(
  editorNotes: string | null | undefined
): QualityReviewState {
  if (!editorNotes) {
    return getDefaultQualityReview();
  }

  try {
    const parsed = JSON.parse(editorNotes);
    const qualityReview = parsed?.qualityReview;

    if (!qualityReview) {
      return {
        ...getDefaultQualityReview(),
        notes:
          typeof parsed?.notes === "string"
            ? parsed.notes
            : "",
      };
    }

    return {
      checks: {
        ...defaultChecks,
        ...qualityReview.checks,
      },
      notes: normalizeHumanReviewNotes(qualityReview.notes),
      updatedAt:
        typeof qualityReview.updatedAt === "string"
          ? qualityReview.updatedAt
          : null,
    };
  } catch {
    return {
      ...getDefaultQualityReview(),
      notes: editorNotes,
    };
  }
}

export function serializeQualityReview(
  qualityReview: QualityReviewState
) {
  return JSON.stringify(
    {
      qualityReview,
    },
    null,
    2
  );
}

export function isQualityReviewPassed(
  qualityReview: QualityReviewState
) {
  return Object.values(qualityReview.checks).every(Boolean);
}

export function normalizeHumanReviewNotes(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("{")) {
    return value;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const nestedNotes = parsed?.qualityReview?.notes ?? parsed?.notes;

    return typeof nestedNotes === "string" &&
      !nestedNotes.trim().startsWith("{")
      ? nestedNotes
      : "";
  } catch {
    return value;
  }
}
