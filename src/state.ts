import { findCity, type City } from './cities'
import type { WorkHours } from './planner'
import { addDays, localDate, minutesOfDay, zonedInstant, type DateString } from './time'

export const STEP = 15
export const MAX_CITIES = 12
const DAY = 24 * 60

export interface Settings {
  /** City ids; the first is home, whose day the timeline shows. */
  cityIds: string[]
  work: WorkHours
  use24h: boolean
}

export interface PlannerState extends Settings {
  /** The home date on show. */
  date: DateString
  /** The selected time, in minutes past home midnight, on a 15-minute grid. */
  minutes: number
}

export type Action =
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'makeHome'; id: string }
  | { type: 'setWork'; work: WorkHours }
  | { type: 'set24h'; use24h: boolean }
  | { type: 'setDate'; date: DateString }
  | { type: 'shiftDate'; days: number }
  | { type: 'setMinutes'; minutes: number }
  | { type: 'nudge'; by: number }
  | { type: 'goTo'; t: number }

export const citiesOf = (state: Settings): City[] =>
  state.cityIds.flatMap((id) => {
    const city = findCity(id)
    return city ? [city] : []
  })

const homeZone = (cityIds: string[]) => (cityIds[0] && findCity(cityIds[0])?.tz) || 'UTC'

/** The selected moment as an instant. */
export const selectedInstant = (state: PlannerState) => zonedInstant(homeZone(state.cityIds), state.date, state.minutes)

/** Date and time showing instant `t` for these cities' home, snapped down to the 15-minute grid. */
function at(cityIds: string[], t: number): Pick<PlannerState, 'date' | 'minutes'> {
  const tz = homeZone(cityIds)
  return { date: localDate(tz, t), minutes: Math.floor(minutesOfDay(tz, t) / STEP) * STEP }
}

/** Change the city list while keeping the selected moment (a new home zone means a new home date/time). */
function withCities(state: PlannerState, cityIds: string[]): PlannerState {
  return { ...state, cityIds, ...at(cityIds, selectedInstant(state)) }
}

export function initialState(settings: Settings, now: number): PlannerState {
  return { ...settings, ...at(settings.cityIds, now) }
}

export function reducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case 'add':
      if (state.cityIds.includes(action.id) || state.cityIds.length >= MAX_CITIES || !findCity(action.id)) return state
      return { ...state, cityIds: [...state.cityIds, action.id] }
    case 'remove':
      if (state.cityIds.length <= 1 || !state.cityIds.includes(action.id)) return state
      return withCities(state, state.cityIds.filter((id) => id !== action.id))
    case 'makeHome':
      if (state.cityIds[0] === action.id || !state.cityIds.includes(action.id)) return state
      return withCities(state, [action.id, ...state.cityIds.filter((id) => id !== action.id)])
    case 'setWork': {
      const [start, end] = action.work
      return start < end ? { ...state, work: [start, end] } : state
    }
    case 'set24h':
      return { ...state, use24h: action.use24h }
    case 'setDate':
      return { ...state, date: action.date }
    case 'shiftDate':
      return { ...state, date: addDays(state.date, action.days) }
    case 'setMinutes':
      return { ...state, minutes: Math.max(0, Math.min(DAY - STEP, Math.round(action.minutes / STEP) * STEP)) }
    case 'nudge': {
      // Moving past either end of the day rolls over into the neighbouring day.
      const total = state.minutes + action.by
      const days = Math.floor(total / DAY)
      return { ...state, date: addDays(state.date, days), minutes: total - days * DAY }
    }
    case 'goTo':
      return { ...state, ...at(state.cityIds, action.t) }
  }
}
