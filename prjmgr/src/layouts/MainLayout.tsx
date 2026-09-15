import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  FolderKanban,
  Calendar,
  Users,
  BarChart3,
  Archive,
  Settings,
  LayoutTemplate,
  Menu,
  X,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'
import { useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import clsx from 'clsx'

const navItems = [
  { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban },
  { to: '/calendar', label: 'تقویم', icon: Calendar },
  { to: '/resources', label: 'منابع', icon: Users },
  { to: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
  { to: '/templates', label: 'قالب‌ها', icon: LayoutTemplate },
  { to: '/backups', label: 'پشتیبان‌گیری', icon: Archive },
  { to: '/settings', label: 'تنظیمات', icon: Settings },
]

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { theme, setTheme } = useSettingsStore()

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <div className="app-shell">
      {/* Mobile header */}
      <header className="mobile-header">
        <button
          className="btn btn-icon"
          onClick={() => setSidebarOpen(true)}
          aria-label="منو"
        >
          <Menu size={22} />
        </button>
        <h1 className="mobile-title">مدیریت پروژه</h1>
        <button className="btn btn-icon" onClick={cycleTheme} aria-label="تغییر تم">
          <ThemeIcon size={20} />
        </button>
      </header>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx('sidebar', sidebarOpen && 'sidebar-open')}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">PM</div>
            <div>
              <div className="logo-title">پروژه من</div>
              <div className="logo-sub">نسخه Light · آفلاین</div>
            </div>
          </div>
          <button
            className="btn btn-icon close-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="بستن منو"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={clsx('nav-item', isActive && 'nav-item-active')}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="privacy-badge">
            <span className="privacy-dot" />
            اطلاعات فقط روی دستگاه شما
          </div>
          <button className="btn btn-ghost btn-sm theme-btn" onClick={cycleTheme}>
            <ThemeIcon size={16} />
            {theme === 'light' ? 'روشن' : theme === 'dark' ? 'تاریک' : 'سیستم'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav safe-bottom">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={clsx('bottom-nav-item', isActive && 'bottom-nav-active')}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <style>{`
        .app-shell {
          display: flex;
          min-height: 100vh;
          background: var(--bg-app);
        }
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          right: 0;
          left: 0;
          height: 56px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          z-index: 40;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
        }
        .mobile-title {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .sidebar {
          width: 260px;
          background: var(--bg-sidebar);
          color: var(--text-on-dark);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 50;
          transition: transform 0.3s ease;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          color: white;
        }
        .logo-title {
          font-weight: 700;
          font-size: 1.05rem;
        }
        .logo-sub {
          font-size: 0.75rem;
          opacity: 0.6;
        }
        .close-sidebar {
          display: none;
          color: var(--text-on-dark);
        }
        .sidebar-nav {
          flex: 1;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          color: rgba(255,255,255,0.7);
          font-weight: 500;
          transition: all 0.2s;
        }
        .nav-item:hover {
          background: var(--bg-sidebar-hover);
          color: white;
        }
        .nav-item-active {
          background: rgba(15, 118, 110, 0.3);
          color: #5eead4;
        }
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .privacy-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          opacity: 0.7;
          padding: 0.5rem 0.75rem;
          background: rgba(34, 197, 94, 0.15);
          border-radius: 8px;
          color: #86efac;
        }
        .privacy-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .theme-btn {
          color: rgba(255,255,255,0.7);
          justify-content: flex-start;
        }
        .main-content {
          flex: 1;
          margin-right: 260px;
          padding: 1.5rem;
          min-height: 100vh;
        }
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          right: 0;
          left: 0;
          background: var(--bg-card);
          border-top: 1px solid var(--border);
          z-index: 40;
          padding: 0.5rem 0;
          justify-content: space-around;
        }
        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          font-size: 0.7rem;
          color: var(--text-secondary);
          padding: 0.35rem 0.5rem;
          border-radius: 8px;
          min-width: 56px;
        }
        .bottom-nav-active {
          color: var(--color-primary);
        }
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 45;
        }

        @media (max-width: 900px) {
          .sidebar {
            transform: translateX(100%);
          }
          .sidebar-open {
            transform: translateX(0);
          }
          .close-sidebar {
            display: flex;
          }
          .sidebar-overlay {
            display: block;
          }
          .main-content {
            margin-right: 0;
            padding: 1rem;
            padding-top: 72px;
            padding-bottom: 80px;
          }
          .mobile-header {
            display: flex;
          }
          .bottom-nav {
            display: flex;
          }
        }
      `}</style>
    </div>
  )
}
