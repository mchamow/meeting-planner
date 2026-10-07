// Time zone math on top of Intl: everything is an instant (ms since epoch) plus a zone, and wall
// times are derived from the zone's real rules, so daylight saving shifts come out right.

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE

/** A calendar date as `YYYY-MM-DD`. */
export type DateString = string

interface WallTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function wallFormatter(tz: string) {
  let formatter = formatters.get(tz)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    })
    formatters.set(tz, formatter)
  }
  return formatter
}

/** The wall-clock reading in `tz` at instant `t`. */
export function wallTime(tz: string, t: number): WallTime {
  const parts: Record<string, string> = {}
  for (const { type, value } of wallFormatter(tz).formatToParts(t)) parts[type] = value
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  }
}

/** Minutes `tz` is ahead of UTC at instant `t` (e.g. 120 for Warsaw in summer, -300 for New York in winter). */
export function offsetMinutes(tz: string, t: number): number {
  const w = wallTime(tz, t)
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute)
  return Math.round((asUtc - Math.floor(t / MINUTE) * MINUTE) / MINUTE)
}

/** Minutes since local midnight in `tz` at instant `t`. */
export function minutesOfDay(tz: string, t: number): number {
  const w = wallTime(tz, t)
  return w.hour * 60 + w.minute
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The local calendar date in `tz` at instant `t`. */
export function localDate(tz: string, t: number): DateString {
  const w = wallTime(tz, t)
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`
}

function parseDate(date: DateString): [number, number, number] {
  const [year, month, day] = date.split('-').map(Number)
  return [year, month, day]
}

export const isDateString = (value: unknown): value is DateString =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

/**
 * The instant when the wall clock in `tz` reads `minutes` past midnight on `date`. A wall time
 * repeated by an autumn change picks the first; one skipped in spring moves forward by the gap.
 */
export function zonedInstant(tz: string, date: DateString, minutes: number): number {
  const [year, month, day] = parseDate(date)
  const wall = Date.UTC(year, month - 1, day, 0, minutes)
  // Try the offsets in force a day either side: a candidate is right if the zone really has that
  // offset at it. Zones don't change twice within two days, so these cover every case.
  const before = wall - offsetMinutes(tz, wall - 24 * HOUR) * MINUTE
  const after = wall - offsetMinutes(tz, wall + 24 * HOUR) * MINUTE
  const fits = (t: number) => wall - offsetMinutes(tz, t) * MINUTE === t
  const valid = [before, after].filter(fits)
  return valid.length ? Math.min(...valid) : before
}

export function addDays(date: DateString, days: number): DateString {
  const [year, month, day] = parseDate(date)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** `14:30`, or `2:30 PM` with a 12-hour clock. */
export function formatClock(minutes: number, use24h: boolean): string {
  const h = Math.floor(minutes / 60) % 24
  const m = pad(minutes % 60)
  if (use24h) return `${pad(h)}:${m}`
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}

export const formatTime = (tz: string, t: number, use24h: boolean) => formatClock(minutesOfDay(tz, t), use24h)

/** The hour as a timeline cell shows it: `14` or `2p`. */
export function formatHour(hour: number, use24h: boolean): string {
  if (use24h) return String(hour)
  return `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`
}

/** `+2`, `-5`, `+5:30`, `±0`: an offset or a difference in minutes, as people write it. */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return '±0'
  const sign = minutes > 0 ? '+' : '−'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}${m ? `:${pad(m)}` : ''}`
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>()

/** `Thu, Oct 8` (or with the year: `Thu, Oct 8, 2026`) for the calendar date `date`. */
export function formatDate(date: DateString, withYear = false): string {
  const key = String(withYear)
  let formatter = dateFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {}),
    })
    dateFormatters.set(key, formatter)
  }
  const [year, month, day] = parseDate(date)
  return formatter.format(Date.UTC(year, month - 1, day))
}

/** Whole days from `from` to `to` (both calendar dates). */
export function dayDifference(from: DateString, to: DateString): number {
  const [y1, m1, d1] = parseDate(from)
  const [y2, m2, d2] = parseDate(to)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (24 * HOUR))
}
