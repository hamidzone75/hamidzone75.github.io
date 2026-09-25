import React from 'react';
import {
  Mic,
  History,
  FileAudio,
  Sparkles,
  Cpu,
  Wifi,
  WifiOff,
  Keyboard,
  Info,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  onOpenVoiceCommands: () => void;
  onOpenFileTranscribe: () => void;
  onOpenHistory: () => void;
  onOpenOfflineManager: () => void;
  isModelReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVoiceCommands,
  onOpenFileTranscribe,
  onOpenHistory,
  onOpenOfflineManager,
  isModelReady,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-sky-400 shadow-md shadow-cyan-500/20">
            <Mic className="w-5 h-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                آوا‌نویس
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PWA v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              تایپ صوتی بلادرنگ و بازشناسی آفلاین گفتار فارسی
            </p>
          </div>
        </div>

        {/* Center / Status Badges */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Network State */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>آنلاین</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>آفلاین (بدون اینترنت)</span>
              </>
            )}
          </div>

          {/* Offline AI Model State */}
          <button
            onClick={onOpenOfflineManager}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition cursor-pointer ${
              isModelReady
                ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40'
                : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="مدیریت موتور هوش مصنوعی آفلاین"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>مدل آفلاین: {isModelReady ? 'آماده (Whisper)' : 'تنظیم'}</span>
          </button>
        </div>

        {/* Action Buttons & Install */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Voice Commands Guide */}
          <button
            onClick={onOpenVoiceCommands}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition cursor-pointer"
            title="راهنمای علائم نگارشی و فرامین صوتی"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">فرامین صوتی</span>
          </button>

          {/* Transcribe File */}
          <button
            onClick={onOpenFileTranscribe}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition cursor-pointer"
            title="تبدیل فایل صوتی به متن"
          >
            <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">تبدیل فایل</span>
          </button>

          {/* History */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition cursor-pointer"
            title="تاریخچه یادداشت‌ها"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">تاریخچه</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
