export interface City {
  id: string
  name: string
  /** Country or region, shown as a hint and searchable. */
  country: string
  /** IANA time zone, e.g. `Europe/Warsaw`. */
  tz: string
}

// [name, country, time zone]: well-known cities, so people can search by the city they think of
// rather than by the zone's representative city (nobody looks for "Kolkata" to find Mumbai).
const CURATED: [string, string, string][] = [
  ['UTC', 'Coordinated Universal Time', 'UTC'],
  ['Honolulu', 'United States', 'Pacific/Honolulu'],
  ['Anchorage', 'United States', 'America/Anchorage'],
  ['San Francisco', 'United States', 'America/Los_Angeles'],
  ['Los Angeles', 'United States', 'America/Los_Angeles'],
  ['Seattle', 'United States', 'America/Los_Angeles'],
  ['Vancouver', 'Canada', 'America/Vancouver'],
  ['Denver', 'United States', 'America/Denver'],
  ['Phoenix', 'United States', 'America/Phoenix'],
  ['Mexico City', 'Mexico', 'America/Mexico_City'],
  ['Chicago', 'United States', 'America/Chicago'],
  ['Austin', 'United States', 'America/Chicago'],
  ['New York', 'United States', 'America/New_York'],
  ['Boston', 'United States', 'America/New_York'],
  ['Miami', 'United States', 'America/New_York'],
  ['Toronto', 'Canada', 'America/Toronto'],
  ['Bogotá', 'Colombia', 'America/Bogota'],
  ['Lima', 'Peru', 'America/Lima'],
  ['Santiago', 'Chile', 'America/Santiago'],
  ['Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires'],
  ['São Paulo', 'Brazil', 'America/Sao_Paulo'],
  ['St. John’s', 'Canada', 'America/St_Johns'],
  ['Reykjavík', 'Iceland', 'Atlantic/Reykjavik'],
  ['London', 'United Kingdom', 'Europe/London'],
  ['Dublin', 'Ireland', 'Europe/Dublin'],
  ['Lisbon', 'Portugal', 'Europe/Lisbon'],
  ['Madrid', 'Spain', 'Europe/Madrid'],
  ['Barcelona', 'Spain', 'Europe/Madrid'],
  ['Paris', 'France', 'Europe/Paris'],
  ['Amsterdam', 'Netherlands', 'Europe/Amsterdam'],
  ['Brussels', 'Belgium', 'Europe/Brussels'],
  ['Berlin', 'Germany', 'Europe/Berlin'],
  ['Munich', 'Germany', 'Europe/Berlin'],
  ['Zurich', 'Switzerland', 'Europe/Zurich'],
  ['Rome', 'Italy', 'Europe/Rome'],
  ['Milan', 'Italy', 'Europe/Rome'],
  ['Vienna', 'Austria', 'Europe/Vienna'],
  ['Prague', 'Czechia', 'Europe/Prague'],
  ['Warsaw', 'Poland', 'Europe/Warsaw'],
  ['Kraków', 'Poland', 'Europe/Warsaw'],
  ['Copenhagen', 'Denmark', 'Europe/Copenhagen'],
  ['Stockholm', 'Sweden', 'Europe/Stockholm'],
  ['Oslo', 'Norway', 'Europe/Oslo'],
  ['Helsinki', 'Finland', 'Europe/Helsinki'],
  ['Athens', 'Greece', 'Europe/Athens'],
  ['Kyiv', 'Ukraine', 'Europe/Kyiv'],
  ['Istanbul', 'Turkey', 'Europe/Istanbul'],
  ['Moscow', 'Russia', 'Europe/Moscow'],
  ['Cairo', 'Egypt', 'Africa/Cairo'],
  ['Lagos', 'Nigeria', 'Africa/Lagos'],
  ['Nairobi', 'Kenya', 'Africa/Nairobi'],
  ['Johannesburg', 'South Africa', 'Africa/Johannesburg'],
  ['Cape Town', 'South Africa', 'Africa/Johannesburg'],
  ['Tel Aviv', 'Israel', 'Asia/Jerusalem'],
  ['Dubai', 'United Arab Emirates', 'Asia/Dubai'],
  ['Tehran', 'Iran', 'Asia/Tehran'],
  ['Karachi', 'Pakistan', 'Asia/Karachi'],
  ['Mumbai', 'India', 'Asia/Kolkata'],
  ['Delhi', 'India', 'Asia/Kolkata'],
  ['Bengaluru', 'India', 'Asia/Kolkata'],
  ['Kathmandu', 'Nepal', 'Asia/Kathmandu'],
  ['Dhaka', 'Bangladesh', 'Asia/Dhaka'],
  ['Bangkok', 'Thailand', 'Asia/Bangkok'],
  ['Jakarta', 'Indonesia', 'Asia/Jakarta'],
  ['Singapore', 'Singapore', 'Asia/Singapore'],
  ['Kuala Lumpur', 'Malaysia', 'Asia/Kuala_Lumpur'],
  ['Hong Kong', 'China', 'Asia/Hong_Kong'],
  ['Shanghai', 'China', 'Asia/Shanghai'],
  ['Beijing', 'China', 'Asia/Shanghai'],
  ['Taipei', 'Taiwan', 'Asia/Taipei'],
  ['Manila', 'Philippines', 'Asia/Manila'],
  ['Seoul', 'South Korea', 'Asia/Seoul'],
  ['Tokyo', 'Japan', 'Asia/Tokyo'],
  ['Adelaide', 'Australia', 'Australia/Adelaide'],
  ['Brisbane', 'Australia', 'Australia/Brisbane'],
  ['Sydney', 'Australia', 'Australia/Sydney'],
  ['Melbourne', 'Australia', 'Australia/Melbourne'],
  ['Perth', 'Australia', 'Australia/Perth'],
  ['Auckland', 'New Zealand', 'Pacific/Auckland'],
]

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const curated: City[] = CURATED.map(([name, country, tz]) => ({ id: slug(name), name, country, tz }))

function supportedZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}

/** A city for a zone no curated city covers, named after the zone's own city: `America/Argentina/Salta` → Salta. */
function zoneCity(tz: string): City {
  const segments = tz.split('/')
  return {
    id: tz,
    name: segments[segments.length - 1].replace(/_/g, ' '),
    country: segments.length > 1 ? segments[0] : 'Time zone',
    tz,
  }
}

const covered = new Set(curated.map((city) => city.tz))

/** Every city the planner knows: the curated list, then one entry per remaining IANA zone. */
export const CITIES: City[] = [
  ...curated,
  ...supportedZones()
    .filter((tz) => !covered.has(tz))
    .map(zoneCity)
    .sort((a, b) => a.name.localeCompare(b.name)),
]

const byId = new Map(CITIES.map((city) => [city.id, city]))

/** The city with this id; ids of zone cities are the zone itself, so any valid zone resolves. */
export const findCity = (id: string): City | undefined =>
  byId.get(id) ?? (id.includes('/') && isValidZone(id) ? zoneCity(id) : undefined)

/** The city to start with for someone in `tz`: a curated city in that zone, else the zone itself, else UTC. */
export function cityForZone(tz: string): City {
  return CITIES.find((city) => city.tz === tz) ?? (isValidZone(tz) ? zoneCity(tz) : byId.get('utc')!)
}

function isValidZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
