import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FolderOpen,
  Archive,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  ArchiveRestore,
  Calendar,
  User
} from 'lucide-react';
import { useProjects, useProjectCount } from '../hooks/useProjects';
import {
  createProject,
  archiveProject,
  deleteProject,
  duplicateProject
} from '../db/projectService';
import type { Project } from '../types';
import { dateService } from '../engines/date';
import clsx from 'clsx';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const includeArchived = filter === 'archived' || filter === 'all';
  const { projects, isLoading } = useProjects(includeArchived);
  const counts = useProjectCount();

  const filtered = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase()));
    if (!matchSearch) return false;

    if (filter === 'active')
      return !p.isArchived && p.status !== 'Completed' && p.status !== 'Cancelled';
    if (filter === 'completed') return p.status === 'Completed';
    if (filter === 'archived') return p.isArchived;
    return true;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject({ name: newName.trim() });
      setNewName('');
      setShowCreate(false);
    } catch (e) {
      console.error('Create project failed', e);
      alert('خطا در ایجاد پروژه. لطفاً دوباره تلاش کنید.');
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (id: string) => {
    setMenuOpen(null);
    await archiveProject(id);
  };

  const handleDelete = async (id: string, name: string) => {
    setMenuOpen(null);
    if (
      !confirm(
        `آیا از حذف دائمی پروژه «${name}» مطمئن هستید؟\nاین عمل قابل بازگشت نیست.`
      )
    )
      return;
    await deleteProject(id);
  };

  const handleDuplicate = async (id: string) => {
    setMenuOpen(null);
    await duplicateProject(id);
  };

  const statusLabel: Record<string, string> = {
    Planning: 'برنامه‌ریزی',
    'Not Started': 'شروع نشده',
    'In Progress': 'در حال اجرا',
    'On Hold': 'متوقف',
    Completed: 'تکمیل‌شده',
    Cancelled: 'لغو شده',
    Archived: 'بایگانی'
  };

  const statusColor: Record<string, string> = {
    Planning: '#6366f1',
    'Not Started': '#94a3b8',
    'In Progress': '#0f766e',
    'On Hold': '#f59e0b',
    Completed: '#22c55e',
    Cancelled: '#ef4444',
    Archived: '#64748b'
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">پروژه‌ها</h1>
          <p className="page-desc">
            {counts.total > 0
              ? `${counts.active} فعال · ${counts.completed} تکمیل‌شده · ${counts.archived} بایگانی`
              : 'مدیریت پروژه‌های محلی شما · کاملاً آفلاین'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          پروژه جدید
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="جستجوی پروژه..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {(
            [
              ['all', 'همه'],
              ['active', 'فعال'],
              ['completed', 'تکمیل‌شده'],
              ['archived', 'بایگانی']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={clsx('chip', filter === key && 'chip-active')}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          در حال بارگذاری...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <FolderOpen size={48} strokeWidth={1.5} className="empty-icon" />
          <h2>
            {search || filter !== 'all'
              ? 'پروژه‌ای با این فیلتر یافت نشد'
              : 'هنوز پروژه‌ای ایجاد نشده'}
          </h2>
          <p>
            {search || filter !== 'all'
              ? 'فیلتر یا جستجو را تغییر دهید.'
              : 'اولین پروژه خود را بسازید. تمام اطلاعات فقط روی این دستگاه ذخیره می‌شود.'}
          </p>
          {!search && filter === 'all' && (
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={18} />
                ایجاد پروژه جدید
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((p) => (
            <div key={p.id} className="project-card card">
              <div className="card-top">
                <Link to={`/projects/${p.id}`} className="project-name">
                  {p.name}
                </Link>
                <div className="card-menu">
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuOpen === p.id && (
                    <div className="dropdown">
                      <button onClick={() => handleDuplicate(p.id)}>
                        <Copy size={16} /> کپی
                      </button>
                      {!p.isArchived ? (
                        <button onClick={() => handleArchive(p.id)}>
                          <Archive size={16} /> بایگانی
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            setMenuOpen(null);
                            await import('../db/projectService').then((m) =>
                              m.unarchiveProject(p.id)
                            );
                          }}
                        >
                          <ArchiveRestore size={16} /> بازگردانی
                        </button>
                      )}
                      <button
                        className="danger"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        <Trash2 size={16} /> حذف دائمی
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {p.code && <div className="project-code">{p.code}</div>}

              <div className="project-meta">
                <span
                  className="status-badge"
                  style={{ background: statusColor[p.status] + '22', color: statusColor[p.status] }}
                >
                  {statusLabel[p.status] || p.status}
                </span>
                {p.startDate && (
                  <span className="meta-item">
                    <Calendar size={14} />
                    {(() => {
                      const d = dateService.parse(p.startDate);
                      return d ? dateService.format(d) : p.startDate;
                    })()}
                  </span>
                )}
                {p.managerName && (
                  <span className="meta-item">
                    <User size={14} />
                    {p.managerName}
                  </span>
                )}
              </div>

              {p.description && (
                <p className="project-desc">{p.description.slice(0, 100)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>ایجاد پروژه جدید</h2>
            <label>
              نام پروژه *
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: ساخت ساختمان اداری"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </label>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                انصراف
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? 'در حال ایجاد...' : 'ایجاد پروژه'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .page-title { font-size: 1.75rem; margin-bottom: 0.25rem; }
        .page-desc { color: var(--text-secondary); font-size: 0.95rem; }
        .toolbar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 220px;
          max-width: 360px;
        }
        .search-box input {
          width: 100%;
          padding: 0.65rem 1rem 0.65rem 2.5rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--bg-card);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.95rem;
        }
        .search-box input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
        }
        .search-icon {
          position: absolute;
          right: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .filter-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .chip {
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          font-size: 0.875rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          transition: all 0.2s;
        }
        .chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .chip-active {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .empty-state {
          text-align: center;
          padding: 3.5rem 2rem;
          max-width: 520px;
          margin: 2rem auto;
        }
        .empty-icon { color: var(--text-muted); margin-bottom: 1.25rem; }
        .empty-state h2 { font-size: 1.35rem; margin-bottom: 0.75rem; }
        .empty-state p { color: var(--text-secondary); margin-bottom: 1.75rem; line-height: 1.7; }
        .empty-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .project-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: box-shadow 0.2s, transform 0.2s;
          position: relative;
        }
        .project-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-2px);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .project-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .project-name:hover { color: var(--color-primary); }
        .card-menu { position: relative; }
        .dropdown {
          position: absolute;
          left: 0;
          top: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-lg);
          z-index: 20;
          min-width: 160px;
          padding: 0.35rem;
        }
        .dropdown button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: transparent;
          color: var(--text-primary);
          font-size: 0.9rem;
          border-radius: 6px;
          text-align: right;
        }
        .dropdown button:hover { background: var(--bg-app); }
        .dropdown button.danger { color: var(--color-danger); }
        .project-code {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-family: monospace;
        }
        .project-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          align-items: center;
        }
        .status-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .project-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }
        .modal {
          width: 100%;
          max-width: 420px;
          padding: 1.5rem;
        }
        .modal h2 { margin-bottom: 1.25rem; font-size: 1.25rem; }
        .modal label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
        }
        .modal input {
          width: 100%;
          padding: 0.7rem 1rem;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--bg-app);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 1rem;
          margin-bottom: 1.25rem;
        }
        .modal input:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
}
