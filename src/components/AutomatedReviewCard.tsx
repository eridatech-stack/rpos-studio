import { AsyncActionButton } from "@/components/AsyncActionButton";
import type { AutomatedReviewState } from "@/modules/editorial/automatedReview";

export function AutomatedReviewCard({
  articleId,
  review,
}: {
  articleId: string;
  review: AutomatedReviewState | null;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Automated Review</h2>

          <p className="mt-1 text-sm text-slate-500">
            SEO, readability, links, and image checks.
          </p>
        </div>

        <AsyncActionButton
          endpoint="/api/editorial/automated-review"
          body={{ articleId }}
          idleLabel="Run Review"
          loadingLabel="Reviewing..."
          successTitle="Automated review complete"
          successDescription="The review results were saved."
          errorTitle="Automated review failed"
          defaultErrorMessage="Unable to run automated review."
          variant="secondary"
        />
      </div>

      {review ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-500">
                  Score
                </div>

                <div className="mt-1 text-3xl font-black">
                  {review.score}%
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  review.score >= 80
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {review.score >= 80 ? "Strong" : "Needs review"}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {review.summary}
            </p>
          </div>

          <div className="space-y-2">
            {review.findings.map((finding) => (
              <div
                key={finding.key}
                className="rounded-lg border bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-slate-800">
                    {finding.label}
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      finding.severity === "pass"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {finding.severity}
                  </span>
                </div>

                <div className="mt-1 text-slate-500">
                  {finding.message}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Last run: {new Date(review.updatedAt).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border bg-slate-50 p-4 text-sm text-slate-500">
          Run an automated review after the draft is ready.
        </div>
      )}
    </div>
  );
}
