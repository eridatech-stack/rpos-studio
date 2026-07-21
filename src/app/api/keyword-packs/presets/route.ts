import { NextResponse } from "next/server";
import {
  getKeywordPackPreset,
  listKeywordPackPresets,
} from "@/modules/keyword-packs/presets";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({
      success: true,
      presets: listKeywordPackPresets(),
    });
  }

  const preset = getKeywordPackPreset(id);

  if (!preset) {
    return NextResponse.json(
      {
        error: "Keyword pack preset not found.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    success: true,
    preset,
  });
}
