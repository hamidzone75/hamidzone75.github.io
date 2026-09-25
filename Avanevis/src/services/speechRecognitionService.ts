/**
 * Persian Speech Recognition Service (Real-time Web Speech API + Audio Analysis)
 */

// Typing for Web Speech API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type SpeechEngineStatus =
  | 'idle'
  | 'listening'
  | 'paused'
  | 'processing'
  | 'error'
  | 'unsupported';

export interface SpeechRecognitionCallbacks {
  onInterim: (interimText: string) => void;
  onFinal: (finalText: string) => void;
  onStatusChange: (status: SpeechEngineStatus) => void;
  onError: (errorMessage: string) => void;
  onAudioLevel?: (level: number, frequencyData: Uint8Array) => void;
}

export class PersianSpeechRecognitionService {
  private recognition: any = null;
  private isIntentionallyStopped = true;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private currentLanguage = 'fa-IR';
  private callbacks: SpeechRecognitionCallbacks;

  constructor(callbacks: SpeechRecognitionCallbacks) {
    this.callbacks = callbacks;
    this.initSpeechRecognition();
  }

  private initSpeechRecognition(): boolean {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.callbacks.onStatusChange('unsupported');
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.callbacks.onStatusChange('listening');
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let finalized = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          if (item.isFinal) {
            finalized += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          this.callbacks.onInterim(interim);
        }
        if (finalized) {
          this.callbacks.onFinal(finalized);
        }
      };

      this.recognition.onerror = (event: any) => {
        // 'no-speech' is common and harmless during quiet periods
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'not-allowed') {
          this.callbacks.onError('دسترسی به میکروفون رد شد. لطفاً اجازه دسترسی را در مرورگر صادر فرمایید.');
          this.stop();
          return;
        }
        if (event.error === 'network') {
          this.callbacks.onError('خطای شبکه در بازشناسی گفتار آنلاین. برای حالت آفلاین از بخش مدل آفلاین استفاده فرمایید.');
          return;
        }
        console.warn('SpeechRecognition error:', event.error);
      };

      this.recognition.onend = () => {
        // Auto-restart if still marked as listening
        if (!this.isIntentionallyStopped) {
          try {
            this.recognition.start();
          } catch {
            // Wait slightly before restarting
            setTimeout(() => {
              if (!this.isIntentionallyStopped) {
                try {
                  this.recognition.start();
                } catch (e) {
                  console.error('Failed to restart speech recognition:', e);
                }
              }
            }, 300);
          }
        } else {
          this.callbacks.onStatusChange('idle');
        }
      };

      return true;
    } catch (err) {
      console.error('Failed to instantiate SpeechRecognition:', err);
      this.callbacks.onStatusChange('unsupported');
      return false;
    }
  }

  public async start(): Promise<boolean> {
    if (!this.recognition && !this.initSpeechRecognition()) {
      this.callbacks.onError('مرورگر شما از تایپ صوتی بومی پشتیبانی نمی‌کند یا دسترسی محدود است.');
      return false;
    }

    this.isIntentionallyStopped = false;

    // Start AudioContext & Analyser for visual waves and sound meters
    try {
      await this.startAudioAnalysis();
    } catch (err) {
      console.warn('Could not start audio analyser:', err);
    }

    try {
      this.recognition.start();
      this.callbacks.onStatusChange('listening');
      return true;
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // Already started
        return true;
      }
      console.error('Error starting recognition:', err);
      this.callbacks.onError('شروع ضبط با خطا مواجه شد. لطفاً دوباره تلاش کنید.');
      return false;
    }
  }

  public stop(): void {
    this.isIntentionallyStopped = true;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Error stopping recognition:', err);
      }
    }

    this.stopAudioAnalysis();
    this.callbacks.onStatusChange('idle');
  }

  private async startAudioAnalysis(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateAudioLevels = () => {
      if (!this.analyser || this.isIntentionallyStopped) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate root mean square or average amplitude
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));

      if (this.callbacks.onAudioLevel) {
        this.callbacks.onAudioLevel(normalizedLevel, dataArray);
      }

      this.animFrameId = requestAnimationFrame(updateAudioLevels);
    };

    updateAudioLevels();
  }

  private stopAudioAnalysis(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.analyser = null;
  }

  public static isSupported(): boolean {
    const win = window as unknown as IWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }
}
