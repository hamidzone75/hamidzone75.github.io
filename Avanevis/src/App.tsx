import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Copy,
  Check,
  Download,
  Trash2,
  Share2,
  Sparkles,
  FileDown,
  Printer,
  Sliders,
  Type,
  Maximize2,
  Save,
  Volume2,
  Cpu,
  Wifi,
  WifiOff,
  Layers,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { Header } from './components/Header';
import { AudioVisualizer } from './components/AudioVisualizer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { VoiceCommandsModal } from './components/VoiceCommandsModal';
import { FileTranscribeModal } from './components/FileTranscribeModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { OfflineModelManager } from './components/OfflineModelManager';
import {
  PersianSpeechRecognitionService,
  SpeechEngineStatus,
} from './services/speechRecognitionService';
import { offlineWhisperService } from './services/offlineWhisperService';
import {
  cleanPersianTypography,
  toPersianDigits,
  toEnglishDigits,
  countPersianWords,
  formatPersianDate,
  applyPersianVoiceCommands,
} from './utils/persianUtils';
import {
  saveRecord,
  TranscriptionRecord,
  exportAsSrt,
  downloadFile,
} from './services/storageService';
import { useOnlineStatus } from './hooks/useOnlineStatus';

export default function App() {
  const isOnline = useOnlineStatus();

  // State
  const [transcribedText, setTranscribedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [engineStatus, setEngineStatus] = useState<SpeechEngineStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('برای شروع صحبت، دکمه میکروفون را فشار دهید.');
  const [isVoiceCommandsEnabled, setIsVoiceCommandsEnabled] = useState(true);
  const [isPersianNumbers, setIsPersianNumbers] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'lg' | 'xl'>('lg');
  const [title, setTitle] = useState('یادداشت صوتی جدید');
  const [copied, setCopied] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => 'rec_' + Date.now());

  // Modals state
  const [isVoiceCommandsOpen, setIsVoiceCommandsOpen] = useState(false);
  const [isFileTranscribeOpen, setIsFileTranscribeOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isOfflineManagerOpen, setIsOfflineManagerOpen] = useState(false);

  // References
  const speechServiceRef = useRef<PersianSpeechRecognitionService | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  // Initialize offline model check
  useEffect(() => {
    offlineWhisperService.isModelCached().then((cached) => {
      setIsModelReady(cached);
    });
  }, []);

  // Initialize Speech Recognition Service
  useEffect(() => {
    const service = new PersianSpeechRecognitionService({
      onInterim: (interim) => {
        setInterimText(interim);
      },
      onFinal: (final) => {
        setInterimText('');
        setTranscribedText((prev) => {
          let updated = (prev ? prev + ' ' : '') + final.trim();
          if (isVoiceCommandsEnabled) {
            updated = applyPersianVoiceCommands(updated);
          } else {
            updated = cleanPersianTypography(updated);
          }
          return updated;
        });
      },
      onStatusChange: (status) => {
        setEngineStatus(status);
        if (status === 'listening') {
          setIsRecording(true);
          setStatusMessage('در حال گوش دادن به صحبت‌های شما به زبان فارسی...');
        } else if (status === 'idle') {
          setIsRecording(false);
          setAudioLevel(0);
          setStatusMessage('میکروفون متوقف شد. برای ادامه صحبت دوباره دکمه را لمس فرمایید.');
        } else if (status === 'unsupported') {
          setStatusMessage('مرورگر شما از تایپ صوتی بومی پشتیبانی نمی‌کند؛ از بخش مدل آفلاین استفاده فرمایید.');
        }
      },
      onError: (errMsg) => {
        setStatusMessage(errMsg);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
    });

    speechServiceRef.current = service;

    return () => {
      service.stop();
    };
  }, [isVoiceCommandsEnabled]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Auto-save note to local storage every 5 seconds if changed
  useEffect(() => {
    if (!transcribedText.trim()) return;

    const timer = setTimeout(() => {
      const stats = countPersianWords(transcribedText);
      const record: TranscriptionRecord = {
        id: activeSessionId,
        title: title || 'یادداشت صوتی فارسی',
        text: transcribedText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        durationSeconds: durationSeconds,
        source: 'mic',
        wordCount: stats.words,
      };
      saveRecord(record);
    }, 3000);

    return () => clearTimeout(timer);
  }, [transcribedText, title, durationSeconds, activeSessionId]);

  // Keyboard shortcut listener (Space or Ctrl+Space to toggle recording)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused inside textarea, do not intercept normal space bar
      if (e.target === editorRef.current) return;

      if (e.code === 'Space' || (e.ctrlKey && e.code === 'Space')) {
        e.preventDefault();
        toggleRecording();
      } else if (e.code === 'Escape' && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  // Toggle Recording
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    if (!speechServiceRef.current) return;
    setStatusMessage('در حال اتصال به میکروفون...');
    const success = await speechServiceRef.current.start();
    if (success) {
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (speechServiceRef.current) {
      speechServiceRef.current.stop();
    }
    setIsRecording(false);
  };

  // Text tools
  const handleCopy = () => {
    const fullText = (transcribedText + (interimText ? ' ' + interimText : '')).trim();
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNormalizeTypography = () => {
    if (!transcribedText) return;
    const cleaned = cleanPersianTypography(transcribedText);
    setTranscribedText(cleaned);
  };

  const handleTogglePersianDigits = () => {
    if (!transcribedText) return;
    if (isPersianNumbers) {
      setTranscribedText(toEnglishDigits(transcribedText));
      setIsPersianNumbers(false);
    } else {
      setTranscribedText(toPersianDigits(transcribedText));
      setIsPersianNumbers(true);
    }
  };

  const handleClear = () => {
    if (transcribedText && confirm('آیا از پاک کردن تمام متن اطمینان دارید؟')) {
      setTranscribedText('');
      setInterimText('');
      setDurationSeconds(0);
      setActiveSessionId('rec_' + Date.now());
      setTitle('یادداشت صوتی جدید');
    }
  };

  const handleSaveToHistory = () => {
    if (!transcribedText.trim()) return;
    const stats = countPersianWords(transcribedText);
    const record: TranscriptionRecord = {
      id: activeSessionId,
      title: title || 'یادداشت صوتی فارسی',
      text: transcribedText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      durationSeconds: durationSeconds,
      source: 'mic',
      wordCount: stats.words,
    };
    saveRecord(record);
    alert('یادداشت صوتی با موفقیت در تاریخچه محلی آفلاین ذخیره شد.');
  };

  // Export handlers
  const handleExportTxt = () => {
    const fullText = (transcribedText + (interimText ? ' ' + interimText : '')).trim();
    if (!fullText) return;
    downloadFile(fullText, `${title || 'متن_فارسی'}.txt`);
    setShowExportMenu(false);
  };

  const handleExportSrt = () => {
    const fullText = (transcribedText + (interimText ? ' ' + interimText : '')).trim();
    if (!fullText) return;
    const stats = countPersianWords(fullText);
    const dummyRecord: TranscriptionRecord = {
      id: activeSessionId,
      title,
      text: fullText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      durationSeconds: Math.max(durationSeconds, stats.minutes * 60),
      source: 'mic',
      wordCount: stats.words,
    };
    const srt = exportAsSrt(dummyRecord);
    downloadFile(srt, `${title || 'زیرنویس_فارسی'}.srt`, 'text/plain;charset=utf-8');
    setShowExportMenu(false);
  };

  const handleExportMarkdown = () => {
    const fullText = (transcribedText + (interimText ? ' ' + interimText : '')).trim();
    if (!fullText) return;
    const md = `# ${title || 'یادداشت صوتی فارسی'}\n\n*تاریخ: ${formatPersianDate()}*\n\n---\n\n${fullText}\n`;
    downloadFile(md, `${title || 'یادداشت'}.md`);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    window.print();
    setShowExportMenu(false);
  };

  const handleShare = async () => {
    const fullText = (transcribedText + (interimText ? ' ' + interimText : '')).trim();
    if (!fullText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'متن بازشناسی صوتی آوا‌نویس',
          text: fullText,
        });
      } catch (err) {
        console.warn('Share cancelled', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleInsertVoiceCommand = (cmdText: string) => {
    setTranscribedText((prev) => (prev ? prev + cmdText : cmdText));
  };

  const handleLoadRecord = (record: TranscriptionRecord) => {
    setActiveSessionId(record.id);
    setTitle(record.title);
    setTranscribedText(record.text);
    setInterimText('');
    setDurationSeconds(record.durationSeconds || 0);
  };

  // Stats calculation
  const stats = countPersianWords(transcribedText + (interimText ? ' ' + interimText : ''));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        onOpenVoiceCommands={() => setIsVoiceCommandsOpen(true)}
        onOpenFileTranscribe={() => setIsFileTranscribeOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenOfflineManager={() => setIsOfflineManagerOpen(true)}
        isModelReady={isModelReady}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* Top Control Hero: Mic & Waveform Card */}
        <section className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 md:p-6 shadow-2xl relative overflow-hidden">
          {/* Background Ambient Glow */}
          <div
            className={`absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
              isRecording ? 'bg-cyan-500/20' : 'bg-slate-800/20'
            }`}
          />
          <div
            className={`absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
              isRecording ? 'bg-rose-500/15' : 'bg-indigo-900/15'
            }`}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Main Interactive Mic Button */}
            <div className="relative my-2">
              {/* Outer pulsing ring when recording */}
              {isRecording && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping" />
                  <div className="absolute -inset-2 rounded-full bg-cyan-400/30 animate-pulse" />
                </>
              )}

              <button
                onClick={toggleRecording}
                className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer shadow-2xl ${
                  isRecording
                    ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-rose-600/40 ring-4 ring-rose-400/40'
                    : 'bg-gradient-to-tr from-cyan-600 via-indigo-600 to-sky-500 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/30 hover:scale-105'
                }`}
                title="کلیک یا فشردن کلید Space برای شروع یا توقف ضبط"
                aria-label={isRecording ? 'توقف ضبط صدا' : 'شروع تایپ صوتی'}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
                    <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
                      توقف
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8 sm:w-10 sm:h-10" />
                    <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
                      شروع صحبت
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Status Text & Shortcut hint */}
            <div className="mt-3 space-y-1">
              <p
                className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                  isRecording ? 'text-cyan-300 animate-pulse' : 'text-slate-300'
                }`}
              >
                {statusMessage}
              </p>
              <p className="text-xs text-slate-500">
                کلید میانبر: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Space</kbd> برای شروع/توقف، <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc</kbd> برای لغو
              </p>
            </div>

            {/* Audio Waveform Canvas */}
            <div className="w-full mt-5">
              <AudioVisualizer
                isRecording={isRecording}
                audioLevel={audioLevel}
                durationSeconds={durationSeconds}
              />
            </div>
          </div>
        </section>

        {/* Text Editor & Processing Suite */}
        <section className="flex-1 rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-xl flex flex-col gap-4">
          {/* Document Title & Quick Options Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            {/* Title editable input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base sm:text-lg font-bold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none transition py-1 px-1 max-w-sm"
              placeholder="عنوان یادداشت صوتی..."
            />

            {/* Quick Actions (Copy, Save, Export) */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                disabled={!transcribedText && !interimText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition disabled:opacity-40 cursor-pointer"
                title="کپی کردن متن در کلیپ‌بورد"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>کپی متن</span>
                  </>
                )}
              </button>

              {/* Save Button */}
              <button
                onClick={handleSaveToHistory}
                disabled={!transcribedText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition disabled:opacity-40 cursor-pointer"
                title="ذخیره در تاریخچه محلی"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">ذخیره</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                disabled={!transcribedText && !interimText}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition disabled:opacity-40 cursor-pointer"
                title="اشتراک‌گذاری"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {/* Export Dropdown Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={!transcribedText && !interimText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-40 cursor-pointer"
                  title="دانلود و خروجی فایل"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>خروجی</span>
                </button>

                {showExportMenu && (
                  <div className="absolute left-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-700 p-2 shadow-2xl z-30 space-y-1">
                    <button
                      onClick={handleExportTxt}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 transition text-right"
                    >
                      <FileDown className="w-3.5 h-3.5 text-cyan-400" />
                      <span>دانلود فایل متنی (TXT)</span>
                    </button>
                    <button
                      onClick={handleExportSrt}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 transition text-right"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>دانلود زیرنویس زمان‌دار (SRT)</span>
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 transition text-right"
                    >
                      <Type className="w-3.5 h-3.5 text-purple-400" />
                      <span>دانلود سند مارک‌داون (MD)</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 transition text-right"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      <span>چاپ / ذخیره PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Clear */}
              <button
                onClick={handleClear}
                disabled={!transcribedText && !interimText}
                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition disabled:opacity-40 cursor-pointer"
                title="پاکسازی متن"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Persian Typography Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Fix Persian Typography & Half-Spaces */}
              <button
                onClick={handleNormalizeTypography}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200 border border-slate-700/60 hover:border-cyan-500/40 transition cursor-pointer"
                title="اصلاح نیم‌فاصله‌های «می»، «ها»، نشانه‌ها و یکدست‌سازی ی و ک"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>اصلاح نیم‌فاصله‌ها و نگارش</span>
              </button>

              {/* Toggle Persian / English Digits */}
              <button
                onClick={handleTogglePersianDigits}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition cursor-pointer border border-slate-700/50"
                title="تغییر ارقام به فارسی یا انگلیسی"
              >
                <span>ارقام:</span>
                <strong className="text-cyan-300 font-mono">
                  {isPersianNumbers ? '۱۲۳ (فارسی)' : '123 (انگلیسی)'}
                </strong>
              </button>

              {/* Voice Commands Toggle */}
              <button
                onClick={() => setIsVoiceCommandsEnabled(!isVoiceCommandsEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                  isVoiceCommandsEnabled
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                }`}
                title="تبدیل کلمات «نقطه»، «ویرگول»، «سر سطر» به علائم نگارشی حین صحبت"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isVoiceCommandsEnabled ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                <span>فرمان‌های صوتی: {isVoiceCommandsEnabled ? 'روشن' : 'خاموش'}</span>
              </button>
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-[11px] ml-1">اندازه قلم:</span>
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded-lg text-xs transition ${
                  fontSize === 'normal' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'
                }`}
              >
                معمولی
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded-lg text-xs transition ${
                  fontSize === 'lg' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'
                }`}
              >
                متوسط
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`px-2 py-0.5 rounded-lg text-xs transition ${
                  fontSize === 'xl' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'
                }`}
              >
                بزرگ
              </button>
            </div>
          </div>

          {/* Text Area with Live Interim Stream Overlay */}
          <div className="relative flex-1 min-h-[300px] flex flex-col rounded-2xl bg-slate-950/90 border border-slate-800/80 p-4 focus-within:border-cyan-500/50 transition">
            <textarea
              ref={editorRef}
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              placeholder="کلمات شما به صورت بلادرنگ اینجا تایپ می‌شوند... یا می‌توانید دستی ویرایش کنید."
              className={`w-full flex-1 bg-transparent resize-none focus:outline-none text-slate-100 placeholder:text-slate-600 leading-relaxed font-sans ${
                fontSize === 'normal'
                  ? 'text-sm'
                  : fontSize === 'lg'
                  ? 'text-base sm:text-lg'
                  : 'text-lg sm:text-xl'
              }`}
              dir="rtl"
            />

            {/* Live Streaming Interim Transcript indicator */}
            {interimText && (
              <div className="mt-2 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-sm leading-relaxed flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                <span className="font-medium italic">«{interimText}»</span>
                <span className="text-[10px] text-cyan-400/70 mr-auto shrink-0 font-mono">
                  بلادرنگ...
                </span>
              </div>
            )}
          </div>

          {/* Bottom Statistics & Status Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/70 flex-wrap gap-2">
            {/* Word & Char Counters */}
            <div className="flex items-center gap-3 font-mono">
              <span className="flex items-center gap-1">
                <span className="text-slate-500">کلمات:</span>
                <strong className="text-cyan-400">{toPersianDigits(stats.words)}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500">نویسه‌ها:</span>
                <strong className="text-slate-300">{toPersianDigits(stats.chars)}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500">مدت تخمینی خواندن:</span>
                <strong className="text-indigo-400">{toPersianDigits(stats.minutes)} دقیقه</strong>
              </span>
            </div>

            {/* Auto-save & Local storage badge */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>ذخیره آنی در حافظه محلی آفلاین</span>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-1">
                تایپ بلادرنگ فارسی
              </h4>
              <p className="leading-relaxed text-slate-400">
                پشتیبانی از لهجه‌های مختلف فارسی با تاخیر نزدیک به صفر و تشخیص سریع سکوت‌ها.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-1">
                پشتیبانی آفلاین کامل
              </h4>
              <p className="leading-relaxed text-slate-400">
                با کش شدن سرویس‌ورکر PWA و موتور هوش مصنوعی Whisper، بدون اینترنت نیز گفتار را رونویسی کنید.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-200 mb-1">
                فرمان‌ها و علائم نگارشی
              </h4>
              <p className="leading-relaxed text-slate-400">
                با گفتن «نقطه»، «ویرگول» یا «خط بعد»، متن به شکل ساختاریافته با نیم‌فاصله مرتب می‌شود.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Offline Notification */}
      <OfflineIndicator />

      {/* Modals & Drawers */}
      <VoiceCommandsModal
        isOpen={isVoiceCommandsOpen}
        onClose={() => setIsVoiceCommandsOpen(false)}
        onInsertCommand={handleInsertVoiceCommand}
      />

      <FileTranscribeModal
        isOpen={isFileTranscribeOpen}
        onClose={() => setIsFileTranscribeOpen(false)}
        onRequestDownloadModel={() => {
          setIsFileTranscribeOpen(false);
          setIsOfflineManagerOpen(true);
        }}
        onTranscribed={(text, newTitle) => {
          setTranscribedText((prev) => (prev ? prev + '\n\n' + text : text));
          if (newTitle) setTitle(newTitle);
        }}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectRecord={handleLoadRecord}
      />

      <OfflineModelManager
        isOpen={isOfflineManagerOpen}
        onClose={() => setIsOfflineManagerOpen(false)}
        onModelReady={() => setIsModelReady(true)}
      />
    </div>
  );
}
