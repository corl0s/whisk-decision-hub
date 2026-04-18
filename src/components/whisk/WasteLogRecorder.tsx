import { Mic, MicOff, Trash2, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WasteItem {
  item: string;
  quantity?: number;
  unit?: string;
  reason?: string;
}

interface WasteLog {
  id: string;
  transcript: string;        // raw speech-to-text
  cleaned?: string;          // AI-polished version
  summary?: string;
  items?: WasteItem[];
  createdAt: string;
  cleaning?: boolean;        // transient UI flag
}

const STORAGE_KEY = "whisk.wasteLogs.v2";

type SR = any;

function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function loadLogs(): WasteLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WasteLog[]) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: WasteLog[]) {
  try {
    // Strip transient flags before persisting
    const persisted = logs.map(({ cleaning, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* ignore quota */
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export const WasteLogRecorder = () => {
  const SpeechRecognitionCtor = getSpeechRecognition();
  const supported = !!SpeechRecognitionCtor;

  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [logs, setLogs] = useState<WasteLog[]>(() => loadLogs());
  const recognitionRef = useRef<SR | null>(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  const cleanWithAI = async (logId: string, transcript: string) => {
    setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, cleaning: true } : l)));
    try {
      const { data, error } = await supabase.functions.invoke("clean-waste-log", {
        body: { transcript },
      });
      if (error) throw error;
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? { ...l, cleaning: false, cleaned: data?.cleaned, summary: data?.summary, items: data?.items ?? [] }
            : l
        )
      );
    } catch (e: any) {
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...l, cleaning: false } : l)));
      const msg = e?.message || "Failed to clean transcript";
      toast({ variant: "destructive", title: "AI cleanup failed", description: msg });
    }
  };

  const startRecording = () => {
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    finalTextRef.current = "";
    setFinalText("");
    setInterim("");

    recognition.onresult = (event: any) => {
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTextRef.current += (finalTextRef.current ? " " : "") + result[0].transcript.trim();
        } else {
          interimChunk += result[0].transcript;
        }
      }
      setFinalText(finalTextRef.current);
      setInterim(interimChunk);
    };

    recognition.onerror = (event: any) => {
      const err = event?.error || "unknown";
      if (err !== "no-speech" && err !== "aborted") {
        toast({
          variant: "destructive",
          title: "Recording error",
          description: err === "not-allowed" ? "Microphone access was denied." : `Speech recognition error: ${err}`,
        });
      }
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
      const transcript = finalTextRef.current.trim();
      setInterim("");
      if (transcript.length > 0) {
        const entry: WasteLog = {
          id: crypto.randomUUID(),
          transcript,
          createdAt: new Date().toISOString(),
          cleaning: true,
        };
        setLogs((prev) => [entry, ...prev].slice(0, 50));
        // Kick off AI cleanup
        cleanWithAI(entry.id, transcript);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
    } catch (e) {
      toast({ variant: "destructive", title: "Could not start", description: String(e) });
    }
  };

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!recording) startRecording();
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (recording) stopRecording();
  };

  const deleteLog = (id: string) => setLogs((prev) => prev.filter((l) => l.id !== id));
  const clearAll = () => setLogs([]);
  const retryClean = (log: WasteLog) => cleanWithAI(log.id, log.transcript);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="text-base font-bold text-foreground">Voice Waste Log</h2>
          <p className="text-xs text-muted-foreground">
            Press &amp; hold the mic to record. AI will clean up your speech and extract waste items automatically.
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-danger transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="p-5">
        {!supported ? (
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm text-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
            <div>
              <div className="font-semibold">Voice recording not supported</div>
              <div className="text-xs text-muted-foreground mt-1">
                Your browser doesn't support the Web Speech API. Try Chrome, Edge, or Safari on desktop.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-elev-md transition-all select-none touch-none ${
                recording
                  ? "bg-danger text-danger-foreground scale-110 animate-pulse"
                  : "bg-gradient-primary text-primary-foreground hover:shadow-elev-lg active:scale-95"
              }`}
              aria-label={recording ? "Recording — release to save" : "Hold to record"}
            >
              {recording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
              {recording && (
                <span className="absolute -inset-2 rounded-full border-2 border-danger/40 animate-ping" />
              )}
            </button>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {recording ? "Listening… release to save" : "Hold to record"}
            </div>

            {(interim || finalText) && (
              <div className="w-full rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">
                <span>{finalText}</span>
                {interim && <span className="text-muted-foreground italic"> {interim}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="border-t border-border">
          <div className="px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Recent logs ({logs.length})
          </div>
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* AI cleaned text (primary) */}
                    {log.cleaning ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                        Polishing transcript with AI…
                      </div>
                    ) : log.cleaned ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                          <Sparkles className="h-3 w-3" />
                          AI Transcript
                        </div>
                        <div className="text-sm text-foreground leading-relaxed">{log.cleaned}</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm text-foreground">{log.transcript}</div>
                        <button
                          onClick={() => retryClean(log)}
                          className="text-[11px] font-semibold text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          Retry AI cleanup
                        </button>
                      </div>
                    )}

                    {/* Extracted items */}
                    {log.items && log.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {log.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md border border-success/20 bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success"
                          >
                            {it.quantity ? `${it.quantity}${it.unit ? ` ${it.unit}` : ""} ` : ""}
                            {it.item}
                            {it.reason ? <span className="font-normal text-success/70">· {it.reason}</span> : null}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Raw transcript (collapsed under AI version) */}
                    {log.cleaned && log.cleaned !== log.transcript && (
                      <details className="group">
                        <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors list-none">
                          <span className="group-open:hidden">Show raw transcript</span>
                          <span className="hidden group-open:inline">Hide raw transcript</span>
                        </summary>
                        <div className="mt-1 text-xs italic text-muted-foreground">{log.transcript}</div>
                      </details>
                    )}

                    <div className="text-[11px] text-muted-foreground tabular-nums">{timeAgo(log.createdAt)}</div>
                  </div>
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="text-muted-foreground hover:text-danger transition-colors p-1"
                    aria-label="Delete log"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
