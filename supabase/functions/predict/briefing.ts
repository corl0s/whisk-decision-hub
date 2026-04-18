// AI Chef's Briefing via Lovable AI Gateway.
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const FALLBACK = "Marathon crowds are nearby. Surge prep on hydration and bowls; cut hot sandwich prep — streets are closed to delivery.";

export async function generateBriefing(context: Record<string, unknown>): Promise<string> {
  if (!LOVABLE_API_KEY) return FALLBACK;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are the AI head chef for a smart-kitchen platform. Write ONE punchy 2-3 sentence briefing for the kitchen team based on the forecast context. The numbers represent TOTALS FOR THE WHOLE DAY — always say 'today' or 'for the day'. NEVER use the words 'shift', 'lunch shift', 'dinner shift', 'per shift', or any time-of-day window. Mention the event if any, the biggest item to prep, the biggest item to hold back on, and a brief why. No bullet points, no headers. Plain text only.",
          },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });
    if (!resp.ok) {
      console.error("AI gateway error", resp.status, await resp.text());
      return FALLBACK;
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() ?? FALLBACK;
  } catch (e) {
    console.error("briefing error", e);
    return FALLBACK;
  }
}
