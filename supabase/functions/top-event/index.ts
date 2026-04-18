// Returns the most popular PredictHQ event for a given date near Boston.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const PHQ = "https://api.predicthq.com/v1/events/";
const LOCATION = "10km@42.3505,-71.1054"; // Boston (matches user's script)
const CATEGORIES = "concerts,festivals,sports,public-holidays,community";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date"); // YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: "date=YYYY-MM-DD required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("PREDICTHQ_API_KEY");
    if (!token) {
      return new Response(JSON.stringify({ error: "PREDICTHQ_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      "active.gte": date,
      "active.lte": date,
      within: LOCATION,
      category: CATEGORIES,
      sort: "phq_attendance",
      limit: "10",
    });

    const phqRes = await fetch(`${PHQ}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (!phqRes.ok) {
      const txt = await phqRes.text();
      return new Response(JSON.stringify({ error: `PredictHQ ${phqRes.status}: ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await phqRes.json();
    const results = (data.results ?? []) as Array<{
      title: string;
      category: string;
      phq_attendance?: number;
      rank?: number;
      labels?: string[];
    }>;

    // Pick highest attendance, fall back to rank
    results.sort((a, b) => {
      const ax = a.phq_attendance ?? 0;
      const bx = b.phq_attendance ?? 0;
      if (bx !== ax) return bx - ax;
      return (b.rank ?? 0) - (a.rank ?? 0);
    });

    const top = results[0] ?? null;

    return new Response(
      JSON.stringify({
        date,
        top: top
          ? {
              title: top.title,
              category: top.category,
              attendance: top.phq_attendance ?? null,
              rank: top.rank ?? null,
            }
          : null,
        count: results.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
