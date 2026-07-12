"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

type ImportResult = {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    keyword?: string;
    message: string;
  }>;
};

export function KeywordCsvImporter() {
  const [file, setFile] =
    useState<File | null>(null);

  const [defaultStatus, setDefaultStatus] =
    useState("approved");

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState<ImportResult | null>(null);

  const router = useRouter();
  const toast = useToast();

  function handleFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setFile(
      event.target.files?.[0] ?? null
    );
    setResult(null);
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!file) {
      toast.warning(
        "No CSV selected",
        "Select a CSV file before importing.",
        10000
      );
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "siteDomain",
        "https://rithm.info"
      );
      formData.append(
        "defaultStatus",
        defaultStatus
      );

      const response = await fetch(
        "/api/keywords/import-csv",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(
          "CSV import failed",
          data.error ||
            "Unable to import the CSV file.",
          15000
        );
        return;
      }

      setResult(data);

      toast.success(
        "Keyword import completed",
        `${data.inserted} inserted, ${data.updated} updated, and ${data.skipped} skipped.`,
        15000
      );

      router.refresh();
    } catch (error: unknown) {
      toast.error(
        "CSV import failed",
        error instanceof Error
          ? error.message
          : "Unexpected import error.",
        15000
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="space-y-5"
      >
        <div>
          <label className="text-sm font-semibold text-slate-700">
            CSV file
          </label>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
          />

          <p className="mt-2 text-xs text-slate-500">
            Maximum 5 MB and 5,000 data
            rows.
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Default import status
          </label>

          <select
            value={defaultStatus}
            onChange={(event) =>
              setDefaultStatus(
                event.target.value
              )
            }
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3"
          >
            <option value="approved">
              Approved — ready for production
            </option>

            <option value="needs_review">
              Needs review
            </option>

            <option value="new">
              New
            </option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={loading || !file}
        >
          {loading
            ? "Importing..."
            : "Import Keywords"}
        </Button>
      </form>

      {result && (
        <div className="mt-6 rounded-xl border bg-slate-50 p-5">
          <h3 className="font-bold">
            Import summary
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Summary
              label="Rows"
              value={result.totalRows}
            />

            <Summary
              label="Inserted"
              value={result.inserted}
            />

            <Summary
              label="Updated"
              value={result.updated}
            />

            <Summary
              label="Skipped"
              value={result.skipped}
            />
          </div>

          {result.errors.length > 0 && (
            <div className="mt-5">
              <h4 className="font-semibold text-red-700">
                Rows requiring attention
              </h4>

              <div className="mt-2 max-h-72 space-y-2 overflow-auto">
                {result.errors
                  .slice(0, 100)
                  .map((error, index) => (
                    <div
                      key={`${error.row}-${index}`}
                      className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                    >
                      Row {error.row}
                      {error.keyword
                        ? ` · ${error.keyword}`
                        : ""}
                      : {error.message}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>
    </div>
  );
}