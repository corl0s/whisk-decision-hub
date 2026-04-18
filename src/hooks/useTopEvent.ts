import { useEffect, useState } from "react";

export interface TopEvent {
  title: string;
  category: string;
  attendance: number | null;
  rank: number | null;
}

export function useTopEvent(date: Date) {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const [event, setEvent] = useState<TopEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/top-event?date=${iso}`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEvent(d?.top ?? null);
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [iso]);

  return { event, loading };
}
