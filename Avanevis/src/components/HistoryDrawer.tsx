import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Trash2,
  Copy,
  Check,
  Star,
  Download,
  Search,
  Clock,
  FileText,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  getHistory,
  deleteRecord,
  toggleFavorite,
  clearAllHistory,
  TranscriptionRecord,
  exportAsSrt,
  downloadFile,
} from '../services/storageService';
import { toPersianDigits, formatDuration } from '../utils/persianUtils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecord: (record: TranscriptionRecord) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectRecord,
}) => {
  const [records, setRecords] = useState<TranscriptionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = () => {
    setRecords(getHistory());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('آیا از حذف این یادداشت صوتی اطمینان دارید؟')) {
      deleteRecord(id);
      loadHistory();
    }
  };

  const handleToggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(id);
    loadHistory();
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportTxt = (record: TranscriptionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadFile(record.text, `${record.title || 'یادداشت_صوتی'}.txt`);
  };

  const handleExportSrt = (record: TranscriptionRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const srt = exportAsSrt(record);
    downloadFile(srt, `${record.title || 'زیرنویس_فارسی'}.srt`, 'text/plain;charset=utf-8');
  };

  const handleClearAll = () => {
    if (confirm('آیا مایلید تمام تاریخچه یادداشت‌های صوتی پاک شود؟ این عملیات غیرقابل بازگشت است.')) {
      clearAllHistory();
      loadHistory();
    }
  };

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = filterFavorites ? rec.isFavorite : true;
    return matchesSearch && matchesFav;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-slate-900 border-r md:border-r-0 md:border-l border-slate-800 p-6 flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                تاریخچه یادداشت‌های صوتی
              </h3>
              <span className="text-xs text-slate-400">
                ذخیره شده در حافظه آفلاین مرورگر
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="my-4 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="جستجو در متن یا عنوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                filterFavorites
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${filterFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>نشان‌شده‌ها</span>
            </button>

            {records.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>پاکسازی کل</span>
              </button>
            )}
          </div>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pl-1">
          {filteredRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 p-6">
              <FileText className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-xs">
                {searchQuery
                  ? 'موردی مطابق با جستجوی شما یافت نشد.'
                  : 'هنوز هیچ یادداشت صوتی ثبت نشده است.'}
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => {
                  onSelectRecord(record);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-950 transition cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition">
                    {record.title || 'یادداشت صوتی'}
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleToggleFav(record.id, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-400 transition"
                      title="نشان کردن"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          record.isFavorite
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-500'
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {record.text}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {formatDuration(record.durationSeconds || 0)}
                    </span>
                    <span>•</span>
                    <span>{toPersianDigits(record.wordCount || 0)} کلمه</span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleCopy(record.text, record.id, e)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="کپی متن"
                    >
                      {copiedId === record.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleExportTxt(record, e)}
                      className="p-1 text-slate-400 hover:text-white"
                      title="دانلود TXT"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleExportSrt(record, e)}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 hover:bg-slate-700"
                      title="دانلود زیرنویس SRT"
                    >
                      SRT
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            تعداد کل یادداشت‌ها: {toPersianDigits(records.length)} مورد
          </p>
        </div>
      </div>
    </div>
  );
};
