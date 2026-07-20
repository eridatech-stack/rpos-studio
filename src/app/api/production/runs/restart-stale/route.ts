import { NextResponse } from "next/server";
import { restartStaleProductionRun } from "@/modules/production/staleProductionRunService";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.productionRunId) {
      return NextResponse.json(
        { error: "productionRunId is required." },
        { status: 400 }
      );
    }

    const result = await restartStaleProductionRun(
      body.productionRunId
    );

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 202 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to restart stale production run.",
      },
      { status: 500 }
    );
  }
}
