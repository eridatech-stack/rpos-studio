import { NextResponse } from "next/server";
import { deleteKeyword } from "@/repositories/keywordRepository";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.keywordId !== "string" ||
      !body.keywordId.trim()
    ) {
      return NextResponse.json(
        {
          error: "keywordId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const deletedKeyword = await deleteKeyword(
      body.keywordId
    );

    return NextResponse.json({
      success: true,
      deletedKeyword,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to delete the keyword.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 409,
      }
    );
  }
}