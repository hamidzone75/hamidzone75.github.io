import React from 'react';
import { X, Mic, Sparkles, HelpCircle, ArrowLeft } from 'lucide-react';
import { PERSIAN_VOICE_COMMANDS, VoiceCommand } from '../utils/persianUtils';

interface VoiceCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCommand?: (text: string) => void;
}

export const VoiceCommandsModal: React.FC<VoiceCommandsModalProps> = ({
  isOpen,
  onClose,
  onInsertCommand,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                فرمان‌های صوتی و علائم نگارشی فارسی
              </h3>
              <p className="text-xs text-slate-400">
                هنگام تایپ صوتی می‌توانید این کلمات را بگویید تا نمادها درج شوند
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tip Banner */}
        <div className="my-4 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 flex items-start gap-3 text-xs text-cyan-300 leading-relaxed">
          <HelpCircle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
          <div>
            <strong>نکته هوشمند:</strong> نیازی به متوقف کردن ضبط نیست؛ فقط حین صحبت مثلاً بگویید:{' '}
            <span className="text-white font-semibold">«امروز جلسه خوبی داشتیم نقطه سر سطر ساعت ده می‌بینمت علامت تعجب»</span>{' '}
            و سیستم خودکار آن را به شکل نگارشی تصحیح می‌کند.
          </div>
        </div>

        {/* Commands Table / Grid */}
        <div className="flex-1 overflow-y-auto pr-1 pl-1 space-y-2.5 my-2">
          {PERSIAN_VOICE_COMMANDS.map((cmd, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-cyan-300 font-mono flex items-center justify-center font-bold text-sm shrink-0 border border-slate-700">
                  {cmd.isAction ? '↵' : cmd.replacement.trim() || '—'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {cmd.keywords.map((kw, ki) => (
                      <span
                        key={ki}
                        className="px-2 py-0.5 rounded-lg bg-slate-800/90 text-slate-200 text-xs font-medium border border-slate-700/60"
                      >
                        «{kw}»
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {cmd.description}
                  </span>
                </div>
              </div>

              {onInsertCommand && (
                <button
                  onClick={() => onInsertCommand(cmd.replacement)}
                  className="px-3 py-1 rounded-xl text-xs bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 transition flex items-center gap-1 opacity-80 group-hover:opacity-100 cursor-pointer"
                  title="درج مستقیم در متن"
                >
                  <span>درج نماد</span>
                  <ArrowLeft className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition cursor-pointer"
          >
            بستن راهنما
          </button>
        </div>
      </div>
    </div>
  );
};
