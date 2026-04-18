import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchPrediction, type PredictResponse } from "@/lib/whiskApi";

interface PredictionState {
  data: PredictResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const Ctx = createContext<PredictionState | null>(null);

export const PredictionProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPrediction()
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
  }, [tick]);

  return (
    <Ctx.Provider value={{ data, loading, error, refresh: () => setTick((t) => t + 1) }}>
      {children}
    </Ctx.Provider>
  );
};

export const usePrediction = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrediction must be inside PredictionProvider");
  return ctx;
};
