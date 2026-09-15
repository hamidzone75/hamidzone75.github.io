import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { Moon, Sun, Monitor, HardDrive, AlertTriangle, CalendarCheck } from 'lucide-react'
import { getStorageEstimate, clearAllData } from '../db/database'
import { useProjectCount } from '../hooks/useProjects'
import { dateService } from '../engines/date'
import { runJalaliSelfTest } from '../engines/date/selftest'

export default function SettingsPage() {
  const { theme, setTheme, language, setLanguage } = useSettingsStore()
  const counts = useProjectCount()
  const [storage, setStorage] = useState({ usage: 0, quota: 0, percent: 0 })
  const [clearing, setClearing] = useState(false)
  const [testResult, setTestResult] = useState<{ passed: number; failed: number; messages: string[] } | null>(null)

  useEffect(() => {
    getStorageEstimate().then(setStorage)
  }, [counts.total])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '۰ بایت'
    const k = 1024
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleClearAll = async () => {
    if (!confirm('هشدار جدی!\n\nتمام پروژه‌ها، تسک‌ها، منابع و تنظیمات برای همیشه حذف می‌شوند.\n\nآیا مطمئن هستید؟')) return
    if (!confirm('این آخرین فرصت است.\nپیشنهاد می‌شود قبل از پاک کردن، از بخش پشتیبان‌گیری یک Backup بگیرید.\n\nادامه می‌دهید؟')) return

    setClearing(true)
    try {
      await clearAllData()
      await import('../db/database').then((m) => m.ensureDefaultSettings())
      alert('تمام داده‌ها پاک شد.')
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert('خطا در پاک کردن داده‌ها')
    } finally {
      setClearing(false)
    }
  }

  const runTest = () => {
    const result = runJalaliSelfTest()
    setTestResult(result)
  }

  const today = dateService.today()
  const todayLong = dateService.formatLong(today)

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>تنظیمات</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        تنظیمات برنامه · اطلاعات شما فقط روی دستگاه ذخیره می‌شود
      </p>

      <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 560 }}>
        {/* Appearance */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>ظاهر</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('light')}>
              <Sun size={16} /> روشن
            </button>
            <button className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('dark')}>
              <Moon size={16} /> تاریک
            </button>
            <button className={`btn ${theme === 'system' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTheme('system')}>
              <Monitor size={16} /> سیستم
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>زبان</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={`btn ${language === 'fa' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLanguage('fa')}>
              فارسی
            </button>
            <button className="btn btn-secondary" disabled>English (به‌زودی)</button>
          </div>
        </div>

        {/* Date Engine */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarCheck size={18} /> موتور تاریخ شمسی
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            امروز: <strong>{todayLong}</strong>
            <br />
            ({dateService.format(today)} شمسی · {dateService.format(today, { system: 'gregorian' })} میلادی)
          </p>
          <button className="btn btn-secondary btn-sm" onClick={runTest}>
            اجرای تست خودکار موتور تاریخ
          </button>
          {testResult && (
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', maxHeight: 200, overflow: 'auto' }}>
              <div style={{ marginBottom: 6 }}>
                نتیجه: <strong style={{ color: testResult.failed === 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {testResult.passed} موفق · {testResult.failed} ناموفق
                </strong>
              </div>
              {testResult.messages.map((m, i) => (
                <div key={i} style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'left' }}>{m}</div>
              ))}
            </div>
          )}
        </div>

        {/* Storage */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HardDrive size={18} /> مدیریت فضای ذخیره‌سازی
          </h3>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div>تعداد پروژه‌ها: <strong>{counts.total}</strong></div>
            <div>فضای استفاده‌شده: <strong>{formatBytes(storage.usage)}</strong></div>
            <div>سهمیه تقریبی: <strong>{formatBytes(storage.quota)}</strong></div>
            {storage.percent > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(storage.percent, 100)}%`,
                    height: '100%',
                    background: storage.percent > 80 ? 'var(--color-danger)' : 'var(--color-primary)',
                    borderRadius: 4
                  }} />
                </div>
                <div style={{ marginTop: 4, fontSize: '0.8rem' }}>{storage.percent}٪ استفاده شده</div>
              </div>
            )}
          </div>
        </div>

        {/* Privacy */}
        <div className="card" style={{ background: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--color-success)' }}>حریم خصوصی:</strong>{' '}
            تمام داده‌های پروژه فقط روی دستگاه شما ذخیره می‌شوند.
            هیچ اطلاعاتی بدون درخواست مستقیم شما به اینترنت ارسال نمی‌شود.
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> منطقه خطر
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            پاک کردن تمام داده‌های محلی. این عمل غیرقابل بازگشت است.
            قبل از انجام، حتماً از بخش پشتیبان‌گیری یک Backup بگیرید.
          </p>
          <button className="btn btn-danger" onClick={handleClearAll} disabled={clearing}>
            {clearing ? 'در حال پاک کردن...' : 'پاک کردن تمام داده‌های محلی'}
          </button>
        </div>
      </div>
    </div>
  )
}
