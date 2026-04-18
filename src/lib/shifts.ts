// Shared shift definitions used by the client UI and sent to the edge function.
// Hours are 24h ints; label is what the user sees.
export type ShiftId = "breakfast" | "lunch" | "afternoon" | "dinner";

export interface ShiftDef {
  id: ShiftId;
  label: string;       // dropdown label
  short: string;       // short header label, e.g. "11a–2p"
  display: string;     // long label e.g. "11:00 AM – 2:00 PM"
  hours: number[];     // hours included in the shift
}

export const SHIFTS: ShiftDef[] = [
  { id: "breakfast", label: "Breakfast (7–11a)",  short: "7–11a",  display: "7:00 AM – 11:00 AM", hours: [7, 8, 9, 10] },
  { id: "lunch",     label: "Lunch (11a–2p)",     short: "11a–2p", display: "11:00 AM – 2:00 PM", hours: [11, 12, 13] },
  { id: "afternoon", label: "Afternoon (2–5p)",   short: "2–5p",   display: "2:00 PM – 5:00 PM",  hours: [14, 15, 16] },
  { id: "dinner",    label: "Dinner (5–8p)",      short: "5–8p",   display: "5:00 PM – 8:00 PM",  hours: [17, 18, 19] },
];

export const getShift = (id: ShiftId): ShiftDef =>
  SHIFTS.find((s) => s.id === id) ?? SHIFTS[1];
