import { create } from 'zustand'
import type { AppSettings } from '../types'

interface SettingsState {
  language: 'fa' | 'en' | 'ar'
  theme: 'light' | 'dark' | 'system'
  timezone: string
  schemaVersion: number
  isLoaded: boolean
  loadSettings: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: 'fa' | 'en' | 'ar') => void
  updateSettings: (partial: Partial<AppSettings>) => void
}

const defaultSettings: AppSettings = {
  id: 'settings',
  language: 'fa',
  theme: 'system',
  timezone: 'Asia/Tehran',
  dateFormat: 'YYYY/MM/DD',
  numberFormat: 'fa-IR',
  workingDays: [0, 1, 2, 3, 4], // شنبه تا چهارشنبه
  workingHoursStart: '08:00',
  workingHoursEnd: '17:00',
  halfDayHours: '08:00-12:00',
  autoBackupEnabled: true,
  autoBackupInterval: 'onChange',
  schemaVersion: 1
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'fa',
  theme: 'system',
  timezone: 'Asia/Tehran',
  schemaVersion: 1,
  isLoaded: false,

  loadSettings: () => {
    try {
      const saved = localStorage.getItem('app-settings')
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppSettings>
        set({
          language: parsed.language || 'fa',
          theme: parsed.theme || 'system',
          timezone: parsed.timezone || 'Asia/Tehran',
          schemaVersion: parsed.schemaVersion || 1,
          isLoaded: true
        })
      } else {
        set({ isLoaded: true })
      }
    } catch {
      set({ isLoaded: true })
    }
  },

  setTheme: (theme) => {
    set({ theme })
    try {
      const current = JSON.parse(localStorage.getItem('app-settings') || '{}')
      localStorage.setItem('app-settings', JSON.stringify({ ...current, theme }))
    } catch { /* ignore */ }
  },

  setLanguage: (language) => {
    set({ language })
    try {
      const current = JSON.parse(localStorage.getItem('app-settings') || '{}')
      localStorage.setItem('app-settings', JSON.stringify({ ...current, language }))
    } catch { /* ignore */ }
  },

  updateSettings: (partial) => {
    set((state) => ({ ...state, ...partial }))
    try {
      const current = JSON.parse(localStorage.getItem('app-settings') || '{}')
      localStorage.setItem('app-settings', JSON.stringify({ ...current, ...partial }))
    } catch { /* ignore */ }
  }
}))
