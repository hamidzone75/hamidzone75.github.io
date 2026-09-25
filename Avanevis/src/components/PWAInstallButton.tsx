import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside standalone PWA mode, hide install trigger
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop native install flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs md:text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/30 transition-all duration-200 active:scale-95 cursor-pointer"
        title="نصب اپلیکیشن روی دستگاه جهت استفاده آفلاین"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>نصب اپلیکیشن</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>نصب روی آیفون / آیپد</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    نصب آوا‌نویس روی iOS (آیفون / آیپد)
                  </h3>
                  <p className="text-xs text-slate-400">
                    اجرای بدون نوار مرورگر و آماده‌سازی برای حالت آفلاین
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 my-4">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ۱
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>در نوار پایین مرورگر سافاری، دکمه</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-xs font-mono">
                      <Share className="w-3.5 h-3.5" /> Share
                    </span>
                    <span>را لمس کنید.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ۲
                  </span>
                  <div>
                    <span>به پایین اسکرول کرده و گزینه</span>
                    <strong className="text-white mx-1">
                      «Add to Home Screen»
                    </strong>
                    <span>(افزودن به صفحه اصلی) را انتخاب کنید.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ۳
                  </span>
                  <div>
                    <span>در گوشه بالا، دکمه</span>
                    <strong className="text-cyan-400 mx-1">«Add»</strong>
                    <span>را بزنید تا آیکون برنامه در کنار سایر برنامه‌های شما قرار گیرد.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400 mb-5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>برنامه بعد از نصب، حتی بدون اتصال اینترنت در دسترس خواهد بود.</span>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
