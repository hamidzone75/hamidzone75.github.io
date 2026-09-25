import React, { useEffect, useRef } from 'react';
import { formatDuration, toPersianDigits } from '../utils/persianUtils';

interface AudioVisualizerProps {
  isRecording: boolean;
  audioLevel: number;
  durationSeconds: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isRecording,
  audioLevel,
  durationSeconds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phaseRef.current += isRecording ? 0.08 : 0.02;
      const currentLevel = isRecording ? Math.max(8, audioLevel) : 4;
      const centerY = height / 2;

      // Draw background center baseline
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw 3 layered sine waves
      const waves = [
        {
          amplitude: (currentLevel / 100) * (height * 0.42),
          frequency: 0.025,
          color: 'rgba(56, 189, 248, 0.85)', // Sky blue
          lineWidth: 3,
          speed: 1,
        },
        {
          amplitude: (currentLevel / 100) * (height * 0.32),
          frequency: 0.04,
          color: 'rgba(129, 140, 248, 0.65)', // Indigo
          lineWidth: 2,
          speed: -1.3,
        },
        {
          amplitude: (currentLevel / 100) * (height * 0.22),
          frequency: 0.015,
          color: 'rgba(192, 132, 252, 0.5)', // Purple
          lineWidth: 1.5,
          speed: 0.7,
        },
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.lineCap = 'round';

        for (let x = 0; x < width; x++) {
          // Attenuate waves near edges
          const edgeDist = Math.min(x, width - x) / (width * 0.25);
          const edgeFade = Math.min(1, Math.max(0, edgeDist));

          const y =
            centerY +
            Math.sin(x * wave.frequency + phaseRef.current * wave.speed) *
              wave.amplitude *
              edgeFade;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-4 shadow-xl overflow-hidden">
      {/* Top Header info inside visualizer */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRecording
                ? 'bg-rose-500 animate-ping shadow-[0_0_12px_#f43f5e]'
                : 'bg-slate-600'
            }`}
          />
          <span className="font-semibold text-slate-200">
            {isRecording ? 'در حال دریافت صدای زنده' : 'میکروفون غیرفعال'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Audio volume level meter */}
          <div className="flex items-center gap-1.5" title="شدت صدا">
            <span className="text-[11px] text-slate-400">شدت:</span>
            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 60
                    ? 'bg-rose-500'
                    : audioLevel > 25
                    ? 'bg-cyan-400'
                    : 'bg-slate-500'
                }`}
                style={{ width: `${isRecording ? audioLevel : 0}%` }}
              />
            </div>
            <span className="w-7 text-right font-mono text-cyan-300">
              {toPersianDigits(isRecording ? audioLevel : 0)}٪
            </span>
          </div>

          {/* Recording Timer */}
          <div className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-slate-800/90 text-cyan-300 border border-slate-700/60">
            {formatDuration(durationSeconds)}
          </div>
        </div>
      </div>

      {/* Canvas Waves */}
      <canvas
        ref={canvasRef}
        width={700}
        height={85}
        className="w-full h-20 block cursor-default"
      />

      {/* Ambient gradient glow when recording */}
      {isRecording && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-cyan-500/5 via-indigo-500/10 to-rose-500/5 animate-pulse" />
      )}
    </div>
  );
};
