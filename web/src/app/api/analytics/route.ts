import { NextResponse } from "next/server";
import { computeWeeklyStats, computeHookEffectiveness } from "@/lib/analytics/aggregations";
import { getTopLineMetrics } from "@/lib/analytics";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const personaId = parseInt(searchParams.get("personaId") ?? "1");

  if (!type) {
    return NextResponse.json({ error: "Missing ?type param" }, { status: 400 });
  }

  if (type === "weekly") {
    const week = searchParams.get("week");
    if (!week) {
      return NextResponse.json({ error: "Missing ?week param (YYYY-MM-DD)" }, { status: 400 });
    }
    const stats = await computeWeeklyStats(personaId, week);
    return NextResponse.json(stats);
  }

  if (type === "hooks") {
    const stats = await computeHookEffectiveness(personaId);
    return NextResponse.json(stats);
  }

  if (type === "topline") {
    const metrics = await getTopLineMetrics(personaId);
    return NextResponse.json(metrics);
  }

  return NextResponse.json({ error: `Unknown type "${type}"` }, { status: 400 });
}
