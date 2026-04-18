// Returns the most popular PredictHQ event for a given date near Boston.
// Mirrors the user's predicthq_api_code.py: 10km @ 42.3505,-71.1054
// across concerts, festivals, sports, public-holidays, community.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PHQ_URL = "https://api.predicthq.com/v1/events/";
const LOCATION = "10km@42.3505,-71.1054";
const CATEGORIES = "concerts,festivals,sports,public-holidays,community";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "Query param ?date=YYYY-MM-DD is required" }, 400);
    }

    const token = Deno.env.get("PREDICTHQ_API_KEY");
    if (!token) return json({ error: "PREDICTHQ_API_KEY not configured" }, 500);

    // active.gte/lte both = the day, so we get any event active that day
    const params = new URLSearchParams({
      "active.gte": date,
      "active.lte": date,
      within: LOCATION,
      category: CATEGORIES,
      sort: "-phq_attendance,-rank",
      limit: "20",
    });

    const phqRes = await fetch(`${PHQ_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await phqRes.text();
    if (!phqRes.ok) {
      return json(
        { error: `PredictHQ ${phqRes.status}`, detail: text.slice(0, 500) },
        502,
      );
    }

    const data = JSON.parse(text);
    const results = (data.results ?? []) as Array<{
      title: string;
      category: string;
      phq_attendance?: number;
      rank?: number;
    }>;

    // Defensive sort in case the API ignores ordering
    results.sort((a, b) => {
      const ax = a.phq_attendance ?? 0;
      const bx = b.phq_attendance ?? 0;
      if (bx !== ax) return bx - ax;
      return (b.rank ?? 0) - (a.rank ?? 0);
    });

    const top = results[0] ?? null;
    return json({
      date,
      count: results.length,
      top: top
        ? {
            title: top.title,
            category: top.category,
            attendance: top.phq_attendance ?? null,
            rank: top.rank ?? null,
          }
        : null,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
