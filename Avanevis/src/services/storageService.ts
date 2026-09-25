/**
 * Local storage & IndexedDB persistence for offline transcription notes & history
 */

export interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionRecord {
  id: string;
  title: string;
  text: string;
  segments?: TranscriptionSegment[];
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  isFavorite?: boolean;
  source: 'mic' | 'file';
  wordCount: number;
}

const STORAGE_KEY = 'avanevis_transcription_history_v1';

export function getHistory(): TranscriptionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read transcription history:', err);
    return [];
  }
}

export function saveRecord(record: TranscriptionRecord): void {
  try {
    const history = getHistory();
    const existingIndex = history.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      history[existingIndex] = record;
    } else {
      history.unshift(record);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save transcription:', err);
  }
}

export function deleteRecord(id: string): void {
  try {
    const history = getHistory().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to delete record:', err);
  }
}

export function toggleFavorite(id: string): void {
  try {
    const history = getHistory().map((r) => {
      if (r.id === id) {
        return { ...r, isFavorite: !r.isFavorite };
      }
      return r;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to toggle favorite:', err);
  }
}

export function clearAllHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Format seconds to SRT timestamp: 00:00:00,000
 */
function toSrtTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function exportAsSrt(record: TranscriptionRecord): string {
  if (record.segments && record.segments.length > 0) {
    return record.segments
      .map((seg, idx) => {
        return `${idx + 1}\n${toSrtTimestamp(seg.start)} --> ${toSrtTimestamp(seg.end)}\n${seg.text}\n`;
      })
      .join('\n');
  }

  // Synthesize segments every ~5-8 words if no explicit segments
  const words = record.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const chunkSize = 7;
  const chunkDuration = Math.max(3, record.durationSeconds / Math.ceil(words.length / chunkSize));
  let output = '';
  let curTime = 0;
  let counter = 1;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkText = words.slice(i, i + chunkSize).join(' ');
    const startTime = curTime;
    const endTime = Math.min(record.durationSeconds || (curTime + chunkDuration), curTime + chunkDuration);
    output += `${counter}\n${toSrtTimestamp(startTime)} --> ${toSrtTimestamp(endTime)}\n${chunkText}\n\n`;
    curTime = endTime;
    counter++;
  }

  return output;
}

export function downloadFile(content: string, filename: string, mimeType = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
