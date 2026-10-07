import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { saveSettings } from './store'

const NOW = new Date('2026-10-07T13:07:00Z') // Wed 15:07 in Warsaw
const writeText = vi.fn(() => Promise.resolve())

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  saveSettings({ cityIds: ['warsaw', 'new-york', 'tokyo'], work: [9, 17], use24h: true })
  // jsdom lacks what cmdk and the popover measure with, and the clipboard.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollIntoView = () => {}
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  writeText.mockClear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const rows = () => within(screen.getByRole('list', { name: 'Cities' })).getAllByRole('listitem')
const cityNames = () => rows().map((row) => row.getAttribute('aria-label'))
const times = () => screen.getAllByTestId('selected-time').map((el) => el.textContent)
const status = () => screen.getByRole('status').textContent
const key = (k: string, options: KeyboardEventInit = {}) => fireEvent.keyDown(document.body, { key: k, ...options })
const dateInput = () => screen.getByLabelText('Date') as HTMLInputElement

describe('timeline', () => {
  it('shows every saved city at the selected time, starting now', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Meeting Planner/ })).toBeTruthy()
    expect(cityNames()).toEqual(['Warsaw', 'New York', 'Tokyo'])
    expect(times()).toEqual(['15:00', '09:00', '22:00'])
    expect(dateInput().value).toBe('2026-10-07')
    expect(screen.getByText('Today')).toBeTruthy()
    expect(within(rows()[2]).getByText('+7h')).toBeTruthy()
    expect(within(rows()[0]).getByText(/now 15:07/)).toBeTruthy()
  })

  it('labels each hour cell with the local time and how it suits a meeting', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: '15:00 Warsaw: 09:00 in New York, working hours' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '20:00 Warsaw: 03:00 in Tokyo, Thu, Oct 8, night' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '00:00 Warsaw: 18:00 in New York, Tue, Oct 6, awake' })).toBeTruthy()
  })

  it('picks a time by clicking an hour or using the slider', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^10:00 Warsaw: .* in Tokyo/ }))
    expect(times()).toEqual(['10:00', '04:00', '17:00'])
    const slider = screen.getByRole('slider', { name: 'Meeting time' })
    expect(slider.getAttribute('aria-valuetext')).toBe('10:00 in Warsaw')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(times()).toEqual(['10:15', '04:15', '17:15'])
  })
})

describe('keyboard shortcuts', () => {
  it('nudges the time, rolls over days, jumps to now and to the best time', () => {
    render(<App />)
    key('ArrowRight')
    expect(times()[0]).toBe('15:15')
    key('ArrowLeft', { shiftKey: true })
    expect(times()[0]).toBe('14:15')
    key(']')
    expect(dateInput().value).toBe('2026-10-08')
    expect(screen.getByText('Tomorrow')).toBeTruthy()
    key('[')
    key('[')
    expect(dateInput().value).toBe('2026-10-06')
    key('n')
    expect(dateInput().value).toBe('2026-10-07')
    expect(times()[0]).toBe('15:00')
    key('b')
    // Best bet with Tokyo in the mix: two of three working, nobody asleep at the edges.
    expect(status()).toMatch(/No hour fits everyone's working hours\. Best bet: (\d\d:00), 2 of 3 working\./)
    expect(times()[0]).toBe(status()!.match(/Best bet: (\d\d:00)/)![1])
  })

  it('ignores shortcuts while typing in a field', () => {
    render(<App />)
    fireEvent.keyDown(dateInput(), { key: ']' })
    expect(dateInput().value).toBe('2026-10-07')
  })

  it('still takes letter shortcuts from a focused slider, but leaves it the arrows', () => {
    render(<App />)
    const slider = screen.getByRole('slider', { name: 'Meeting time' })
    fireEvent.keyDown(slider, { key: ']' })
    expect(dateInput().value).toBe('2026-10-08')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(times()[0]).toBe('15:15')
  })
})

describe('dates', () => {
  it('moves between days with the buttons and the date field', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(dateInput().value).toBe('2026-10-06')
    expect(screen.getByText('Yesterday')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    expect(dateInput().value).toBe('2026-10-08')
    fireEvent.change(dateInput(), { target: { value: '2026-12-24' } })
    expect(dateInput().value).toBe('2026-12-24')
    // Winter: New York is 6 h behind Warsaw, Tokyo 8 h ahead.
    expect(times()).toEqual(['15:00', '09:00', '23:00'])
    fireEvent.click(screen.getByRole('button', { name: /Now/ }))
    expect(dateInput().value).toBe('2026-10-07')
  })
})

describe('cities', () => {
  it('removes cities and makes another one home, keeping the moment', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Make Tokyo home' }))
    expect(cityNames()).toEqual(['Tokyo', 'Warsaw', 'New York'])
    expect(times()).toEqual(['22:00', '15:00', '09:00'])
    expect(screen.getByRole('button', { name: 'Tokyo is home' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Tokyo' }))
    expect(cityNames()).toEqual(['Warsaw', 'New York'])
    expect(times()).toEqual(['15:00', '09:00'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove New York' }))
    expect((screen.getByRole('button', { name: 'Remove Warsaw' }) as HTMLButtonElement).disabled).toBe(true)
    expect(status()).toBe('Add a city to compare time zones.')
  })

  it('adds a city from the searchable list', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add city' }))
    const search = await screen.findByRole('combobox', { name: 'Search cities' })
    fireEvent.change(search, { target: { value: 'sydney' } })
    fireEvent.click(await screen.findByRole('option', { name: /Sydney/ }))
    expect(cityNames()).toEqual(['Warsaw', 'New York', 'Tokyo', 'Sydney'])
    expect(times()[3]).toBe('00:00')
    expect(JSON.parse(localStorage.getItem('meeting-planner:settings')!).cityIds).toContain('sydney')
  })

  it('opens the city list with A and leaves out cities already added', async () => {
    render(<App />)
    key('a')
    const search = await screen.findByRole('combobox', { name: 'Search cities' })
    fireEvent.change(search, { target: { value: 'tokyo' } })
    expect(screen.queryByRole('option', { name: /^Tokyo/ })).toBeNull()
  })
})

describe('working hours and overlap', () => {
  it('shows when everyone is working and follows the working-hours slider', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Tokyo' }))
    expect(status()).toBe('Everyone is working 15:00–17:00 Warsaw time.')
    const end = screen.getByRole('slider', { name: 'Working hours end' })
    fireEvent.keyDown(end, { key: 'ArrowRight' })
    expect(screen.getByTestId('work-hours').textContent).toBe('09:00–18:00')
    expect(status()).toBe('Everyone is working 15:00–18:00 Warsaw time.')
    fireEvent.click(screen.getByRole('button', { name: /Best time/ }))
    expect(times()).toEqual(['15:00', '09:00'])
  })
})

describe('settings', () => {
  it('switches to a 12-hour clock', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('switch'))
    expect(times()).toEqual(['3:00 PM', '9:00 AM', '10:00 PM'])
  })

  it('remembers cities, working hours and clock after a reload', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove New York' }))
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Working hours start' }), { key: 'ArrowLeft' })
    unmount()
    render(<App />)
    expect(cityNames()).toEqual(['Warsaw', 'Tokyo'])
    expect(times()).toEqual(['3:00 PM', '10:00 PM'])
    expect(screen.getByTestId('work-hours').textContent).toBe('8:00 AM–5:00 PM')
  })
})

describe('copy', () => {
  it('copies the selected time in every city', async () => {
    render(<App />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Copy times/ })))
    expect(writeText).toHaveBeenCalledWith(
      'Meeting on Wed, Oct 7, 2026\nWarsaw: 15:00 UTC+2\nNew York: 09:00 UTC−4\nTokyo: 22:00 UTC+9',
    )
    expect(screen.getByRole('button', { name: /Copied/ })).toBeTruthy()
  })

  it('copies with C too, and says so when the clipboard refuses', async () => {
    writeText.mockImplementationOnce(() => Promise.reject(new Error('denied')))
    render(<App />)
    await act(async () => key('c'))
    expect(screen.getByRole('button', { name: /Copy failed/ })).toBeTruthy()
  })
})
