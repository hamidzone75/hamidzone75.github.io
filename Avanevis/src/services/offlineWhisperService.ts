/**
 * Offline Transcription Service using @huggingface/transformers (Whisper ONNX)
 * Runs 100% locally in browser WebAssembly/WebGPU with CacheStorage persistence.
 */

export interface ModelProgress {
  status: 'init' | 'downloading' | 'loading' | 'ready' | 'error';
  progress: number; // 0 to 100
  file?: string;
  loadedBytes?: number;
  totalBytes?: number;
  message?: string;
}

export interface OfflineTranscriptionResult {
  text: string;
  chunks?: Array<{
    timestamp: [number, number];
    text: string;
  }>;
}

class OfflineWhisperService {
  private pipelineInstance: any = null;
  private isLoading = false;
  private isReady = false;
  private progressListeners: Array<(progress: ModelProgress) => void> = [];

  public addProgressListener(listener: (progress: ModelProgress) => void): () => void {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter((l) => l !== listener);
    };
  }

  private notifyProgress(progress: ModelProgress) {
    for (const listener of this.progressListeners) {
      try {
        listener(progress);
      } catch (err) {
        console.error('Error in progress listener:', err);
      }
    }
  }

  public getStatus() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading,
    };
  }

  public async isModelCached(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        return cacheKeys.some((key) => key.includes('transformers') || key.includes('onnx'));
      }
      return false;
    } catch {
      return false;
    }
  }

  public async loadModel(): Promise<boolean> {
    if (this.isReady && this.pipelineInstance) {
      return true;
    }
    if (this.isLoading) {
      return false;
    }

    this.isLoading = true;
    this.notifyProgress({
      status: 'init',
      progress: 5,
      message: 'در حال آماده‌سازی موتور هوش مصنوعی آفلاین...',
    });

    try {
      // Dynamic import to prevent main bundle blocking
      const { pipeline, env } = await import('@huggingface/transformers');

      // Configure transformers environment
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      this.notifyProgress({
        status: 'downloading',
        progress: 25,
        message: 'در حال بارگیری وزن‌های مدل بازشناسی فارسی (ذخیره پایدار در مرورگر)...',
      });

      // 'onnx-community/whisper-tiny' is ~39MB quantized, supports multilingual including Persian (fa)
      this.pipelineInstance = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny',
        {
          progress_callback: (info: any) => {
            if (info.status === 'progress' && info.total) {
              const pct = Math.round((info.loaded / info.total) * 100);
              this.notifyProgress({
                status: 'downloading',
                progress: Math.min(95, Math.max(20, pct)),
                file: info.file,
                loadedBytes: info.loaded,
                totalBytes: info.total,
                message: `در حال دریافت فایل مدل: ${Math.round(info.loaded / 1024 / 1024)} مگابایت از ${Math.round(info.total / 1024 / 1024)} مگابایت (${pct}%)`,
              });
            } else if (info.status === 'done') {
              this.notifyProgress({
                status: 'loading',
                progress: 95,
                message: 'در حال کامپایل مدل در وب‌اسمبلی...',
              });
            }
          },
        }
      );

      this.isReady = true;
      this.isLoading = false;
      this.notifyProgress({
        status: 'ready',
        progress: 100,
        message: 'مدل آفلاین با موفقیت بارگذاری شد و در حالت کاملاً آفلاین آماده کار است.',
      });
      return true;
    } catch (err: any) {
      console.error('Failed to load offline whisper model:', err);
      this.isLoading = false;
      this.isReady = false;
      this.notifyProgress({
        status: 'error',
        progress: 0,
        message: `خطا در راه‌اندازی مدل آفلاین: ${err?.message || 'مشکل در بارگیری یا کمبود حافظه'}.`,
      });
      return false;
    }
  }

  /**
   * Transcribe an audio Blob or File using offline Whisper
   */
  public async transcribe(
    audioSource: Blob | File | Float32Array,
    options?: { onProgress?: (msg: string) => void }
  ): Promise<OfflineTranscriptionResult> {
    if (!this.pipelineInstance) {
      const loaded = await this.loadModel();
      if (!loaded) {
        throw new Error('مدل آفلاین هنوز بارگذاری نشده است.');
      }
    }

    if (options?.onProgress) {
      options.onProgress('در حال پردازش سیگنال صوتی...');
    }

    try {
      let audioInput: any = audioSource;

      // If Blob or File, decode to audio buffer if needed, or pass URL
      if (audioSource instanceof Blob || audioSource instanceof File) {
        const audioBuffer = await this.blobToAudioBuffer(audioSource);
        audioInput = audioBuffer.getChannelData(0);
      }

      if (options?.onProgress) {
        options.onProgress('در حال تبدیل صوت به متن فارسی توسط مدل آفلاین...');
      }

      // Execute offline Whisper inference with Persian language configuration
      const output = await this.pipelineInstance(audioInput, {
        language: 'persian',
        task: 'transcribe',
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const text = typeof output === 'string' ? output : (output?.text || '');
      const chunks = output?.chunks || [];

      return {
        text: text.trim(),
        chunks: chunks.map((c: any) => ({
          timestamp: c.timestamp || [0, 0],
          text: c.text || '',
        })),
      };
    } catch (err: any) {
      console.error('Offline transcription failed:', err);
      throw new Error(`خطای پردازش آفلاین: ${err.message || 'عدم امکان بازشناسی گفتار'}`);
    }
  }

  private async blobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx({ sampleRate: 16000 });
    try {
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      return decoded;
    } finally {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }
  }

  public async clearOfflineCache(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        for (const key of cacheKeys) {
          if (key.includes('transformers') || key.includes('onnx')) {
            await window.caches.delete(key);
          }
        }
      }
      this.isReady = false;
      this.pipelineInstance = null;
      return true;
    } catch (err) {
      console.error('Failed to clear offline cache:', err);
      return false;
    }
  }
}

export const offlineWhisperService = new OfflineWhisperService();
