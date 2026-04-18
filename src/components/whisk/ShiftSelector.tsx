import { Clock } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";
import { SHIFTS } from "@/lib/shifts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ShiftSelector = () => {
  const { shift, setShift, loading } = usePrediction();
  return (
    <div className="mt-4 inline-flex items-center gap-2">
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={shift} onValueChange={(v) => setShift(v as typeof shift)} disabled={loading}>
        <SelectTrigger className="h-9 w-[200px] rounded-lg border-border bg-background/60 text-sm font-semibold">
          <SelectValue placeholder="Select shift" />
        </SelectTrigger>
        <SelectContent>
          {SHIFTS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
