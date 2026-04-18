// Open-Meteo weather fetcher — free, no API key required.
// Returns hourly temp/precip/cloud-cover for a given lat/lng/date.
// Docs: https://open-meteo.com/en/docs

export interface HourlyWeather {
  temp_f: number;
  precip: number;   // mm in that hour
  clear: 0 | 1;     // 1 if cloud_cover < 30%
  cloud_pct: number;
}

export interface WeatherDay {
  byHour: Record<number, HourlyWeather>; // hour-of-day (0-23) -> weather
  summary: { condition: string; tempF: number };
  source: "open-meteo" | "fallback";
}

const FALLBACK_TEMP_F = 58;

function cToF(c: number) {
  return c * 9 / 5 + 32;
}

// Open-Meteo accepts dates up to ~16 days in the future for forecast,
// and for past dates returns archive data. We always request hourly arrays.
export async function fetchWeather(
  lat: number,
  lng: number,
  isoDate: string,
  hours: number[],
): Promise<WeatherDay> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("hourly", "temperature_2m,precipitation,cloud_cover");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", isoDate);
  url.searchParams.set("end_date", isoDate);

  try {
    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`open-meteo ${r.status}`);
    const j = await r.json();
    const times: string[] = j?.hourly?.time ?? [];
    const temps: number[] = j?.hourly?.temperature_2m ?? [];
    const precs: number[] = j?.hourly?.precipitation ?? [];
    const clouds: number[] = j?.hourly?.cloud_cover ?? [];

    const byHour: Record<number, HourlyWeather> = {};
    for (let i = 0; i < times.length; i++) {
      const h = new Date(times[i]).getHours();
      const cloud = clouds[i] ?? 50;
      byHour[h] = {
        temp_f: Math.round(temps[i] ?? FALLBACK_TEMP_F),
        precip: Number((precs[i] ?? 0).toFixed(2)),
        clear: cloud < 30 ? 1 : 0,
        cloud_pct: Math.round(cloud),
      };
    }

    // Summary uses lunchtime weather (12-2pm avg) for the header chips
    const lunch = hours.filter(h => h >= 12 && h <= 14).map(h => byHour[h]).filter(Boolean);
    const avgTemp = lunch.length
      ? Math.round(lunch.reduce((s, w) => s + w.temp_f, 0) / lunch.length)
      : FALLBACK_TEMP_F;
    const avgPrecip = lunch.length
      ? lunch.reduce((s, w) => s + w.precip, 0) / lunch.length
      : 0;
    const avgCloud = lunch.length
      ? lunch.reduce((s, w) => s + w.cloud_pct, 0) / lunch.length
      : 50;
    const condition =
      avgPrecip > 0.5 ? "Rain"
      : avgCloud > 70 ? "Overcast"
      : avgCloud > 30 ? "Partly Cloudy"
      : "Clear";

    return {
      byHour,
      summary: { condition, tempF: avgTemp },
      source: "open-meteo",
    };
  } catch (e) {
    console.warn("open-meteo fetch failed, using fallback", e);
    const byHour: Record<number, HourlyWeather> = {};
    for (const h of hours) {
      byHour[h] = { temp_f: FALLBACK_TEMP_F, precip: 0, clear: 1, cloud_pct: 10 };
    }
    return {
      byHour,
      summary: { condition: "Clear", tempF: FALLBACK_TEMP_F },
      source: "fallback",
    };
  }
}

// US federal holidays + a few demo-relevant ones (lookup by MM-DD).
// Used as a categorical "is_holiday" boost — model wasn't trained on this
// directly but day-of-week + lag features absorb most of the signal.
const HOLIDAY_MMDD = new Set([
  "01-01", // New Year's
  "07-04", // Independence Day
  "11-27", // Thanksgiving (approx)
  "12-25", // Christmas
  "05-25", // Memorial Day (approx)
  "09-01", // Labor Day (approx)
  "04-21", // Marathon Monday (Patriots' Day, MA)
]);

export function isHoliday(isoDate: string): boolean {
  return HOLIDAY_MMDD.has(isoDate.slice(5));
}
