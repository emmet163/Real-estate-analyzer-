import { calculate, propertySchema } from "@/lib/finance";
import { guard } from "@/lib/guard";
import { csv } from "@/lib/csv";
export async function POST(req: Request) {
  try {
    guard(req);
    const p = propertySchema.parse(await req.json());
    if (new URL(req.url).searchParams.has("csv"))
      return new Response(csv(p), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="property-analysis.csv"',
        },
      });
    return Response.json(calculate(p));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Invalid inputs" },
      { status: 400 },
    );
  }
}
