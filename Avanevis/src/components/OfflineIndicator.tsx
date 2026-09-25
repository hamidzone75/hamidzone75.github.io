import React from 'react';
import { WifiOff, ShieldCheck, Zap } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside
      aria-label="اعلان وضعیت اتصال آفلاین"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto z-50 flex items-center justify-between gap-3 rounded-2xl bg-amber-950/90 border border-amber-500/40 px-4 py-2.5 text-xs text-amber-200 shadow-2xl backdrop-blur-md max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="font-semibold text-amber-100 flex items-center gap-1.5">
            <span>حالت کاملاً آفلاین</span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <p className="text-[11px] text-amber-300/90 leading-relaxed">
            اینترنت قطع است؛ متن‌ها در حافظه محلی ذخیره می‌شوند و بازشناسی صوتی آفلاین فعال است.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-amber-400/80 bg-amber-900/50 px-2 py-1 rounded-lg shrink-0">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>PWA فعال</span>
      </div>
    </aside>
  );
};
