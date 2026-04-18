import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { usePrediction } from "@/hooks/usePrediction";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const ShiftDatePicker = () => {
  const { date, setDate, loading } = usePrediction();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 rounded-full border-border bg-background/60 px-3 text-xs font-semibold",
            loading && "opacity-70",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-accent" />
          <span className="hidden sm:inline text-muted-foreground">Shift:</span>
          <span>{format(date, "EEE, MMM d")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          disabled={(d) => d < today}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};
