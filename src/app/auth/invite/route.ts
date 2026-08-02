import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Invitation email endpoint retired." },
    { status: 410 },
  );
}
