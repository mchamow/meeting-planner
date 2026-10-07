import type { City } from './cities'
import {
  dayDifference,
  formatDate,
  formatOffset,
  formatTime,
  localDate,
  minutesOfDay,
  offsetMinutes,
  zonedInstant,
  type DateString,
} from './time'

/** Working hours as whole hours of the local day, `[start, end)`. */
export type WorkHours = [number, number]

/** How a local time suits a meeting: inside working hours, awake but off work, or asleep. */
export type Band = 'work' | 'awake' | 'night'

const WAKE = 7 * 60
const SLEEP = 22 * 60

export function bandAt(minutes: number, [start, end]: WorkHours): Band {
  if (minutes >= start * 60 && minutes < end * 60) return 'work'
  return minutes >= WAKE && minutes < SLEEP ? 'awake' : 'night'
}

export interface Cell {
  /** Minutes past local midnight. */
  minutes: number
  /** The local date, when it differs from the home date (the cell then gets a date label). */
  date: DateString
  /** Local date minus the home date in days: -1, 0 or +1. */
  dayShift: number
  band: Band
}

export interface Slot {
  /** The instant the slot starts. */
  t: number
  /** One cell per city, in city order. */
  cells: Cell[]
  /** How many cities are inside working hours. */
  working: number
  /** How many cities are asleep. */
  sleeping: number
}

/** The 24 hourly slots of `date` in the home zone (the first city's), read in every city. */
export function daySlots(date: DateString, cities: City[], work: WorkHours): Slot[] {
  const home = cities[0]?.tz ?? 'UTC'
  return Array.from({ length: 24 }, (_, hour) => {
    const t = zonedInstant(home, date, hour * 60)
    const homeDate = localDate(home, t)
    const cells = cities.map((city): Cell => {
      const minutes = minutesOfDay(city.tz, t)
      const cityDate = localDate(city.tz, t)
      return { minutes, date: cityDate, dayShift: dayDifference(homeDate, cityDate), band: bandAt(minutes, work) }
    })
    return {
      t,
      cells,
      working: cells.filter((cell) => cell.band === 'work').length,
      sleeping: cells.filter((cell) => cell.band === 'night').length,
    }
  })
}

/** Runs of consecutive slots where every city is working, as `[first, last]` slot indexes. */
export function overlaps(slots: Slot[]): [number, number][] {
  const runs: [number, number][] = []
  slots.forEach((slot, i) => {
    if (slot.cells.length === 0 || slot.working < slot.cells.length) return
    const last = runs[runs.length - 1]
    if (last && last[1] === i - 1) last[1] = i
    else runs.push([i, i])
  })
  return runs
}

/** The best slot to meet: most cities working, then fewest asleep, then the earliest. */
export function bestSlot(slots: Slot[]): number {
  let best = 0
  slots.forEach((slot, i) => {
    const current = slots[best]
    if (slot.working > current.working || (slot.working === current.working && slot.sleeping < current.sleeping)) {
      best = i
    }
  })
  return best
}

/** Text to paste into a chat or invite: the date and time in every city. */
export function summary(t: number, cities: City[], use24h: boolean): string {
  const home = cities[0]
  if (!home) return ''
  const homeDate = localDate(home.tz, t)
  const lines = cities.map((city) => {
    const date = localDate(city.tz, t)
    const day = date === homeDate ? '' : ` (${formatDate(date)})`
    const utc = `UTC${formatOffset(offsetMinutes(city.tz, t)).replace('±0', '')}`
    return `${city.name}: ${formatTime(city.tz, t, use24h)}${day} ${utc}`
  })
  return [`Meeting on ${formatDate(homeDate, true)}`, ...lines].join('\n')
}

/** `+6h`, `−9:30h`, or `same time` for a city's offset from the home city at instant `t`. */
export function relativeOffset(city: City, home: City, t: number): string {
  const diff = offsetMinutes(city.tz, t) - offsetMinutes(home.tz, t)
  return diff === 0 ? 'same time' : `${formatOffset(diff)}h`
}

/** The slot index (hour of the home day) containing `minutes` past home midnight. */
export const slotIndex = (minutes: number) => Math.min(23, Math.floor(minutes / 60))
