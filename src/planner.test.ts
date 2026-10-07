import { describe, expect, it } from 'vitest'
import { findCity, type City } from './cities'
import { bandAt, bestSlot, daySlots, overlaps, relativeOffset, summary } from './planner'

const city = (id: string) => findCity(id) as City
const [warsaw, newYork, tokyo, mumbai] = ['warsaw', 'new-york', 'tokyo', 'mumbai'].map(city)

describe('bands', () => {
  it('splits the day into work, awake and night', () => {
    expect(bandAt(9 * 60, [9, 17])).toBe('work')
    expect(bandAt(17 * 60, [9, 17])).toBe('awake')
    expect(bandAt(7 * 60, [9, 17])).toBe('awake')
    expect(bandAt(22 * 60, [9, 17])).toBe('night')
    expect(bandAt(3 * 60, [9, 17])).toBe('night')
    expect(bandAt(3 * 60, [0, 24])).toBe('work')
  })
})

describe('daySlots', () => {
  it('reads each home hour in every city, with day shifts', () => {
    const slots = daySlots('2026-10-07', [warsaw, newYork, tokyo], [9, 17])
    expect(slots).toHaveLength(24)
    // 15:00 in Warsaw (CEST) is 09:00 in New York (EDT) and 22:00 in Tokyo.
    const [wa, ny, tk] = slots[15].cells
    expect(wa).toMatchObject({ minutes: 15 * 60, dayShift: 0, band: 'work' })
    expect(ny).toMatchObject({ minutes: 9 * 60, dayShift: 0, band: 'work' })
    expect(tk).toMatchObject({ minutes: 22 * 60, dayShift: 0, band: 'night' })
    // Warsaw midnight is the previous evening in New York and the next morning in Tokyo.
    expect(slots[0].cells[1]).toMatchObject({ minutes: 18 * 60, dayShift: -1, date: '2026-10-06' })
    expect(slots[20].cells[2]).toMatchObject({ minutes: 3 * 60, dayShift: 1, date: '2026-10-08' })
    expect(slots[15]).toMatchObject({ working: 2, sleeping: 1 })
  })

  it('keeps half-hour zones on the half hour', () => {
    const slots = daySlots('2026-10-07', [warsaw, mumbai], [9, 17])
    expect(slots[10].cells[1].minutes).toBe(13 * 60 + 30)
  })
})

describe('overlaps and best slot', () => {
  it('finds runs where everyone works', () => {
    const slots = daySlots('2026-10-07', [warsaw, newYork], [9, 17])
    // New York works 09–17 = 15–23 Warsaw; Warsaw works until 17.
    expect(overlaps(slots)).toEqual([[15, 16]])
    expect(bestSlot(slots)).toBe(15)
  })

  it('falls back to most working, fewest asleep when no hour suits everyone', () => {
    const slots = daySlots('2026-10-07', [warsaw, newYork, tokyo], [9, 17])
    expect(overlaps(slots)).toEqual([])
    const best = slots[bestSlot(slots)]
    expect(best.working).toBe(2)
    expect(best.sleeping).toBe(1)
  })
})

describe('summary', () => {
  it('lists every city with its date when it differs', () => {
    const t = Date.parse('2026-10-07T20:00Z')
    expect(summary(t, [warsaw, newYork, tokyo], true)).toBe(
      ['Meeting on Wed, Oct 7, 2026', 'Warsaw: 22:00 UTC+2', 'New York: 16:00 UTC−4', 'Tokyo: 05:00 (Thu, Oct 8) UTC+9'].join('\n'),
    )
    expect(summary(t, [city('utc')], false)).toBe('Meeting on Wed, Oct 7, 2026\nUTC: 8:00 PM UTC')
  })

  it('describes offsets relative to home', () => {
    const t = Date.parse('2026-10-07T12:00Z')
    expect(relativeOffset(tokyo, warsaw, t)).toBe('+7h')
    expect(relativeOffset(newYork, warsaw, t)).toBe('−6h')
    expect(relativeOffset(mumbai, warsaw, t)).toBe('+3:30h')
    expect(relativeOffset(city('krakow'), warsaw, t)).toBe('same time')
  })
})
