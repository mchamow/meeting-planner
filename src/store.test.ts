import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings, loadSettings, saveSettings } from './store'

beforeEach(() => localStorage.clear())

describe('defaults', () => {
  it('starts with your zone and big cities elsewhere', () => {
    expect(defaultSettings('Europe/Warsaw').cityIds).toEqual(['warsaw', 'london', 'new-york', 'tokyo'])
    expect(defaultSettings('Europe/London').cityIds).toEqual(['london', 'new-york', 'tokyo'])
    expect(defaultSettings('America/Argentina/Salta').cityIds[0]).toBe('America/Argentina/Salta')
    expect(defaultSettings('Not/AZone').cityIds[0]).toBe('utc')
  })
})

describe('storage', () => {
  it('round-trips settings', () => {
    saveSettings({ cityIds: ['tokyo', 'lima'], work: [8, 18], use24h: false })
    expect(loadSettings()).toEqual({ cityIds: ['tokyo', 'lima'], work: [8, 18], use24h: false })
  })

  it('falls back to defaults on missing or corrupt data', () => {
    const defaults = loadSettings()
    expect(defaults.cityIds.length).toBeGreaterThan(0)
    localStorage.setItem('meeting-planner:settings', '{nope')
    expect(loadSettings()).toEqual(defaults)
    localStorage.setItem('meeting-planner:settings', JSON.stringify([1, 2]))
    expect(loadSettings()).toEqual(defaults)
  })

  it('keeps the valid parts', () => {
    localStorage.setItem(
      'meeting-planner:settings',
      JSON.stringify({ cityIds: ['tokyo', 'atlantis', 'tokyo', 7], work: [17, 9], use24h: 'yes' }),
    )
    expect(loadSettings()).toEqual({ cityIds: ['tokyo'], work: [9, 17], use24h: true })
  })
})
