import React, { useState, useRef } from 'react';
import {
  Upload,
  FileAudio,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileText,
  Volume2,
} from 'lucide-react';
import { offlineWhisperService } from '../services/offlineWhisperService';
import { toPersianDigits, cleanPersianTypography } from '../utils/persianUtils';

interface FileTranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscribed: (text: string, title?: string) => void;
  onRequestDownloadModel: () => void;
}

export const FileTranscribeModal: React.FC<FileTranscribeModalProps> = ({
  isOpen,
  onClose,
  onTranscribed,
  onRequestDownloadModel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [resultText, setResultText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setResultText('');
    setErrorMessage('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      processSelectedFile(file);
    } else {
      setErrorMessage('لطفاً یک فایل صوتی معتبر (MP3, WAV, M4A, OGG) انتخاب فرمایید.');
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStartTranscription = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgressMsg('در حال آماده‌سازی صوت و راه‌اندازی مدل هوش مصنوعی آفلاین...');
    setErrorMessage('');

    try {
      const res = await offlineWhisperService.transcribe(selectedFile, {
        onProgress: (msg) => setProgressMsg(msg),
      });

      const cleaned = cleanPersianTypography(res.text);
      setResultText(cleaned || 'صدایی در فایل تشخیص داده نشد یا کیفیت صدا پایین است.');
      setIsProcessing(false);
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setErrorMessage(
        err.message || 'خطا در تبدیل صوت. لطفاً ابتدا مدل آفلاین را دانلود کنید یا فایل دیگری را امتحان نمایید.'
      );
    }
  };

  const handleTransferToEditor = () => {
    if (resultText) {
      onTranscribed(resultText, selectedFile?.name.replace(/\.[^/.]+$/, ''));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileAudio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                رونویسی و تبدیل فایل صوتی به متن
              </h3>
              <p className="text-xs text-slate-400">
                پشتیبانی از انواع فایل‌های صوتی (MP3, WAV, M4A, OGG) با موتور آفلاین
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

        {/* Upload Drop Zone */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="my-5 p-8 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-3xl bg-slate-950/50 flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 flex items-center justify-center mb-3 transition">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-slate-200 text-sm mb-1">
              فایل صوتی خود را اینجا بکشید یا برای انتخاب کلیک کنید
            </h4>
            <p className="text-xs text-slate-500">
              فرمت‌های مجاز: MP3، WAV، M4A، OGG و ویس‌های تلگرام / واتساپ
            </p>
          </div>
        ) : (
          <div className="my-5 space-y-4">
            {/* File info card with audio player */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 truncate max-w-xs" dir="ltr">
                      {selectedFile.name}
                    </h4>
                    <span className="text-xs text-slate-500">
                      {toPersianDigits((selectedFile.size / 1024 / 1024).toFixed(2))} مگابایت
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setAudioUrl(null);
                    setResultText('');
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                >
                  تعویض فایل
                </button>
              </div>

              {/* HTML5 Audio Player */}
              {audioUrl && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 transition"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    controls
                    className="w-full h-8 accent-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span>{errorMessage}</span>
                  <div className="mt-2">
                    <button
                      onClick={onRequestDownloadModel}
                      className="underline font-bold text-rose-200 hover:text-white"
                    >
                      کلیک برای باز کردن پنجره دانلود مدل آفلاین Whisper
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action button */}
            {!resultText && (
              <button
                onClick={handleStartTranscription}
                disabled={isProcessing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{progressMsg || 'در حال رونویسی صوتی...'}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>شروع تبدیل صوت به متن</span>
                  </>
                )}
              </button>
            )}

            {/* Result box */}
            {resultText && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    متن استخراج شده:
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm leading-relaxed max-h-48 overflow-y-auto font-sans">
                  {resultText}
                </div>

                <button
                  onClick={handleTransferToEditor}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>انتقال متن به ویرایشگر اصلی</span>
                </button>
              </div>
            )}
          </div>
        )}

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
