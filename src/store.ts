import { cityForZone, findCity } from './cities'
import type { WorkHours } from './planner'
import { MAX_CITIES, type Settings } from './state'

const KEY = 'meeting-planner:settings'

const DEFAULT_OTHERS = ['london', 'new-york', 'tokyo']

/** Your own zone first, then a spread of big cities in other zones. */
export function defaultSettings(localZone = Intl.DateTimeFormat().resolvedOptions().timeZone): Settings {
  const home = cityForZone(localZone)
  const others = DEFAULT_OTHERS.filter((id) => findCity(id)?.tz !== home.tz)
  return { cityIds: [home.id, ...others], work: [9, 17], use24h: true }
}

const isObject = (value: unknown): value is { [key: string]: unknown } =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isHour = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 24

function isWorkHours(value: unknown): value is WorkHours {
  return Array.isArray(value) && value.length === 2 && isHour(value[0]) && isHour(value[1]) && value[0] < value[1]
}

/** Saved settings, keeping what's valid and taking the default for the rest. */
export function loadSettings(): Settings {
  const defaults = defaultSettings()
  let saved: unknown
  try {
    const raw = localStorage.getItem(KEY)
    saved = raw === null ? null : JSON.parse(raw)
  } catch {
    return defaults
  }
  if (!isObject(saved)) return defaults
  const cityIds = Array.isArray(saved.cityIds)
    ? [...new Set(saved.cityIds.filter((id): id is string => typeof id === 'string' && !!findCity(id)))].slice(0, MAX_CITIES)
    : []
  return {
    cityIds: cityIds.length ? cityIds : defaults.cityIds,
    work: isWorkHours(saved.work) ? saved.work : defaults.work,
    use24h: typeof saved.use24h === 'boolean' ? saved.use24h : defaults.use24h,
  }
}

export function saveSettings({ cityIds, work, use24h }: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cityIds, work, use24h }))
  } catch {
    // Storage full or blocked: the planner still works, it just won't remember.
  }
}
