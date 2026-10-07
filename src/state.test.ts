import { describe, expect, it } from 'vitest'
import { initialState, reducer, selectedInstant, type PlannerState } from './state'

const now = Date.parse('2026-10-07T13:07Z') // 15:07 in Warsaw
const start = (): PlannerState =>
  initialState({ cityIds: ['warsaw', 'new-york', 'tokyo'], work: [9, 17], use24h: true }, now)

describe('planner state', () => {
  it('starts at now in the home zone, snapped to 15 minutes', () => {
    expect(start()).toMatchObject({ date: '2026-10-07', minutes: 15 * 60 })
  })

  it('adds cities once, up to the limit, and only known ones', () => {
    let s = reducer(start(), { type: 'add', id: 'sydney' })
    expect(s.cityIds).toEqual(['warsaw', 'new-york', 'tokyo', 'sydney'])
    expect(reducer(s, { type: 'add', id: 'sydney' })).toBe(s)
    expect(reducer(s, { type: 'add', id: 'atlantis' })).toBe(s)
    for (const id of ['paris', 'rome', 'oslo', 'lima', 'dubai', 'seoul', 'cairo', 'perth']) s = reducer(s, { type: 'add', id })
    expect(s.cityIds).toHaveLength(12)
    expect(reducer(s, { type: 'add', id: 'boston' })).toBe(s)
  })

  it('keeps the selected moment when home changes or is removed', () => {
    const before = selectedInstant(start())
    const s = reducer(start(), { type: 'makeHome', id: 'tokyo' })
    expect(s.cityIds[0]).toBe('tokyo')
    expect(s).toMatchObject({ date: '2026-10-07', minutes: 22 * 60 })
    expect(selectedInstant(s)).toBe(before)

    const removed = reducer(start(), { type: 'remove', id: 'warsaw' })
    expect(removed.cityIds).toEqual(['new-york', 'tokyo'])
    expect(removed.minutes).toBe(9 * 60)
  })

  it('never removes the last city', () => {
    let s = reducer(start(), { type: 'remove', id: 'tokyo' })
    s = reducer(s, { type: 'remove', id: 'new-york' })
    expect(reducer(s, { type: 'remove', id: 'warsaw' })).toBe(s)
  })

  it('moves the time on a 15-minute grid and rolls over days', () => {
    let s = reducer(start(), { type: 'setMinutes', minutes: 9 * 60 + 8 })
    expect(s.minutes).toBe(9 * 60 + 15)
    s = reducer(s, { type: 'setMinutes', minutes: 9999 })
    expect(s.minutes).toBe(23 * 60 + 45)
    s = reducer(s, { type: 'nudge', by: 15 })
    expect(s).toMatchObject({ date: '2026-10-08', minutes: 0 })
    s = reducer(s, { type: 'nudge', by: -60 })
    expect(s).toMatchObject({ date: '2026-10-07', minutes: 23 * 60 })
  })

  it('changes date, working hours, clock and jumps to an instant', () => {
    let s = reducer(start(), { type: 'shiftDate', days: -1 })
    expect(s.date).toBe('2026-10-06')
    s = reducer(s, { type: 'setDate', date: '2026-12-24' })
    expect(s.date).toBe('2026-12-24')
    s = reducer(s, { type: 'setWork', work: [8, 16] })
    expect(s.work).toEqual([8, 16])
    expect(reducer(s, { type: 'setWork', work: [10, 10] })).toBe(s)
    s = reducer(s, { type: 'set24h', use24h: false })
    expect(s.use24h).toBe(false)
    s = reducer(s, { type: 'goTo', t: now })
    expect(s).toMatchObject({ date: '2026-10-07', minutes: 15 * 60 })
  })
})
