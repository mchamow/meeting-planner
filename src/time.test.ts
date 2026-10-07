import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayDifference,
  formatClock,
  formatDate,
  formatHour,
  formatOffset,
  isDateString,
  localDate,
  minutesOfDay,
  offsetMinutes,
  zonedInstant,
} from './time'

const utc = (iso: string) => Date.parse(iso)

describe('offsets', () => {
  it('follows daylight saving in each zone', () => {
    expect(offsetMinutes('Europe/Warsaw', utc('2026-01-15T12:00Z'))).toBe(60)
    expect(offsetMinutes('Europe/Warsaw', utc('2026-07-15T12:00Z'))).toBe(120)
    expect(offsetMinutes('America/New_York', utc('2026-01-15T12:00Z'))).toBe(-300)
    expect(offsetMinutes('Asia/Kolkata', utc('2026-07-15T12:00Z'))).toBe(330)
    expect(offsetMinutes('Asia/Kathmandu', utc('2026-07-15T12:00Z'))).toBe(345)
    // Southern hemisphere: Sydney is on daylight time in January.
    expect(offsetMinutes('Australia/Sydney', utc('2026-01-15T12:00Z'))).toBe(660)
    expect(offsetMinutes('UTC', utc('2026-01-15T12:00Z'))).toBe(0)
  })

  it('reads local date and minutes of day', () => {
    const t = utc('2026-10-07T23:30Z')
    expect(localDate('Asia/Tokyo', t)).toBe('2026-10-08')
    expect(minutesOfDay('Asia/Tokyo', t)).toBe(8 * 60 + 30)
    expect(localDate('America/Los_Angeles', t)).toBe('2026-10-07')
    expect(minutesOfDay('America/Los_Angeles', t)).toBe(16 * 60 + 30)
  })
})

describe('zonedInstant', () => {
  it('turns a wall time back into the instant', () => {
    expect(zonedInstant('Europe/Warsaw', '2026-10-07', 15 * 60)).toBe(utc('2026-10-07T13:00Z'))
    expect(zonedInstant('America/New_York', '2026-01-02', 0)).toBe(utc('2026-01-02T05:00Z'))
    expect(zonedInstant('Asia/Kolkata', '2026-10-07', 9 * 60)).toBe(utc('2026-10-07T03:30Z'))
  })

  it('handles the days daylight saving starts and ends', () => {
    // Warsaw springs forward on 29 March 2026 at 02:00 → 03:00.
    expect(zonedInstant('Europe/Warsaw', '2026-03-29', 60)).toBe(utc('2026-03-29T00:00Z'))
    expect(zonedInstant('Europe/Warsaw', '2026-03-29', 3 * 60)).toBe(utc('2026-03-29T01:00Z'))
    // 02:30 doesn't exist that night: it moves forward by the hour, to 03:30.
    expect(zonedInstant('Europe/Warsaw', '2026-03-29', 150)).toBe(utc('2026-03-29T01:30Z'))
    // On 25 October 03:00 → 02:00, 02:30 happens twice; the first one wins.
    expect(zonedInstant('Europe/Warsaw', '2026-10-25', 150)).toBe(utc('2026-10-25T00:30Z'))
    expect(zonedInstant('Europe/Warsaw', '2026-10-25', 12 * 60)).toBe(utc('2026-10-25T11:00Z'))
  })
})

describe('dates', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-10-07', 1)).toBe('2026-10-08')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(dayDifference('2026-10-07', '2026-10-08')).toBe(1)
    expect(dayDifference('2026-01-01', '2025-12-31')).toBe(-1)
  })

  it('validates date strings', () => {
    expect(isDateString('2026-10-07')).toBe(true)
    expect(isDateString('2026-13-07')).toBe(false)
    expect(isDateString('yesterday')).toBe(false)
    expect(isDateString(20261007)).toBe(false)
  })
})

describe('formatting', () => {
  it('formats clocks, hours, offsets and dates', () => {
    expect(formatClock(14 * 60 + 5, true)).toBe('14:05')
    expect(formatClock(14 * 60 + 5, false)).toBe('2:05 PM')
    expect(formatClock(0, false)).toBe('12:00 AM')
    expect(formatHour(0, true)).toBe('0')
    expect(formatHour(0, false)).toBe('12a')
    expect(formatHour(13, false)).toBe('1p')
    expect(formatOffset(120)).toBe('+2')
    expect(formatOffset(-570)).toBe('−9:30')
    expect(formatOffset(0)).toBe('±0')
    expect(formatDate('2026-10-08')).toBe('Thu, Oct 8')
    expect(formatDate('2026-10-08', true)).toBe('Thu, Oct 8, 2026')
  })
})
