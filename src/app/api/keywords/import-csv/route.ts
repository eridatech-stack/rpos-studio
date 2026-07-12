import { NextResponse } from "next/server";
import { importKeywordCsv } from "@/modules/keywords/importKeywordCsv";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData =
      await request.formData();

    const file = formData.get("file");
    const siteDomain =
      formData.get("siteDomain");
    const defaultStatus =
      formData.get("defaultStatus");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "A CSV file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "The CSV file must be smaller than 5 MB.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof siteDomain !== "string" ||
      !siteDomain.trim()
    ) {
      return NextResponse.json(
        {
          error: "siteDomain is required.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedStatuses = [
      "new",
      "approved",
      "needs_review",
    ];

    const safeDefaultStatus =
      typeof defaultStatus === "string" &&
      allowedStatuses.includes(
        defaultStatus
      )
        ? defaultStatus
        : "needs_review";

    const csvText = await file.text();

    const result = await importKeywordCsv({
      csvText,
      siteDomain:
        siteDomain.trim(),
      defaultStatus:
        safeDefaultStatus as
          | "new"
          | "approved"
          | "needs_review",
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "CSV import failed.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}