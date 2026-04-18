import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchPrediction, type PredictResponse } from "@/lib/whiskApi";

interface PredictionState {
  data: PredictResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  date: Date;
  setDate: (d: Date) => void;
}

const Ctx = createContext<PredictionState | null>(null);

const toIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const PredictionProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  // Default: Boston Marathon 2026 — keeps the demo's hero scenario intact
  const [date, setDate] = useState<Date>(() => new Date("2026-04-21T12:00:00"));

  const isoDate = useMemo(() => toIso(date), [date]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrediction({ date: isoDate })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load prediction");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, isoDate]);

  return (
    <Ctx.Provider
      value={{
        data,
        loading,
        error,
        refresh: () => setTick((t) => t + 1),
        date,
        setDate,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const usePrediction = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrediction must be inside PredictionProvider");
  return ctx;
};
