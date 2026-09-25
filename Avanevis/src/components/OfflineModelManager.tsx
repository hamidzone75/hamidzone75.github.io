import React, { useEffect, useState } from 'react';
import {
  HardDriveDownload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Cpu,
  Sparkles,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  offlineWhisperService,
  ModelProgress,
} from '../services/offlineWhisperService';
import { toPersianDigits } from '../utils/persianUtils';

interface OfflineModelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onModelReady?: () => void;
}

export const OfflineModelManager: React.FC<OfflineModelManagerProps> = ({
  isOpen,
  onClose,
  onModelReady,
}) => {
  const [modelStatus, setModelStatus] = useState<ModelProgress>({
    status: 'init',
    progress: 0,
    message: '',
  });
  const [isCached, setIsCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check initial cached state
    checkCache();

    // Subscribe to progress
    const unsubscribe = offlineWhisperService.addProgressListener((progress) => {
      setModelStatus(progress);
      if (progress.status === 'ready') {
        setIsLoading(false);
        setIsCached(true);
        if (onModelReady) onModelReady();
      } else if (progress.status === 'error') {
        setIsLoading(false);
      }
    });

    const status = offlineWhisperService.getStatus();
    if (status.isReady) {
      setModelStatus({
        status: 'ready',
        progress: 100,
        message: 'موتور آفلاین آماده به کار است.',
      });
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const checkCache = async () => {
    const cached = await offlineWhisperService.isModelCached();
    setIsCached(cached);
  };

  const handleDownloadModel = async () => {
    setIsLoading(true);
    try {
      await offlineWhisperService.loadModel();
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (confirm('آیا از حذف داده‌های مدل ذخیره شده آفلاین در مرورگر اطمینان دارید؟')) {
      await offlineWhisperService.clearOfflineCache();
      setIsCached(false);
      setModelStatus({
        status: 'init',
        progress: 0,
        message: 'حافظه کش مدل آفلاین پاکسازی شد.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                مدیریت موتور بازشناسی آفلاین (On-Device)
              </h3>
              <p className="text-xs text-slate-400">
                تبدیل صوت به متن بدون نیاز به اینترنت و بدون ارسال داده به سرور
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Status card */}
        <div className="my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">وضعیت موتور داخلی:</span>
              {modelStatus.status === 'ready' || isCached ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  آماده کار آفلاین
                </span>
              ) : isLoading ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  در حال بارگیری
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  بارگیری نشده
                </span>
              )}
            </div>

            <span className="text-xs font-mono text-slate-400">
              Whisper ONNX (~39MB)
            </span>
          </div>

          {/* Progress bar when downloading */}
          {isLoading && (
            <div className="space-y-2 my-3">
              <div className="flex justify-between text-xs text-slate-300">
                <span>{modelStatus.message || 'در حال آماده‌سازی فایل‌ها...'}</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {toPersianDigits(modelStatus.progress)}٪
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${modelStatus.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Explanation message */}
          {modelStatus.message && !isLoading && (
            <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 mt-2">
              {modelStatus.message}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800/60">
            {modelStatus.status !== 'ready' && !isCached ? (
              <button
                onClick={handleDownloadModel}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-600/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال دریافت مدل...</span>
                  </>
                ) : (
                  <>
                    <HardDriveDownload className="w-4 h-4" />
                    <span>دانلود مدل برای کار ۱۰۰٪ آفلاین</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>مدل در Cache مرورگر ذخیره شده است.</span>
                </div>
                <button
                  onClick={handleClearCache}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                  title="حذف مدل از کش جهت آزادسازی فضای ذخیره سازی"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف از حافظه</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="space-y-2.5 text-xs text-slate-300 bg-cyan-950/20 p-4 rounded-2xl border border-cyan-800/30 leading-relaxed mb-4">
          <div className="flex items-center gap-2 font-bold text-cyan-300">
            <Info className="w-4 h-4" />
            <span>نحوه عملکرد بازشناسی گفتار آفلاین در آوا‌نویس:</span>
          </div>
          <p>
            • <strong>روش اول (تایپ صوتی بلادرنگ):</strong> با فناوری Web Speech API صورت می‌گیرد. در صورتی که در تنظیمات گوشی (مثلاً Google Speech Services) یا ویندوز، زبان فارسی دانلود شده باشد، بدون نیاز به مدل اضافی به صورت بلادرنگ و آفلاین تایپ می‌کند.
          </p>
          <p>
            • <strong>روش دوم (موتور Whisper ONNX روی دستگاه):</strong> با بارگیری این مدل، یک شبکه عصبی هوش مصنوعی مستقیماً داخل مرورگر شما کش می‌شود و می‌تواند حتی فایل‌های ضبط شده و فایل‌های صوتی بارگذاری شده را بدون اینترنت پیاده‌سازی نماید.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
