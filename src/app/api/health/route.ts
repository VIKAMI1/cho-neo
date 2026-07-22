import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const provider =
    (process.env.ONG_DIA_PROVIDER ?? process.env.ONG_DIA_AI_PROVIDER ?? "openai")
      .trim()
      .toLowerCase() || "openai";

  return NextResponse.json(
    {
      ok: true,
      service: "cho-neo",
      checks: {
        ongDiaProviderConfigured: provider === "openai",
        openAiKeyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
        supabasePublicConfigPresent: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
            (
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
            ),
        ),
        gossipPostingDisabled:
          process.env.CHO_NEO_GOSSIP_POSTING_DISABLED === "1",
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
