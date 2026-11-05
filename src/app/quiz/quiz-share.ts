import { InjectionToken } from '@angular/core';

export const QUIZ_SHARE_STATUS_MS = 3000;

export const QUIZ_CARD_FILE = new InjectionToken<(card: QuizShareCard) => File | null>(
  'QUIZ_CARD_FILE',
  { providedIn: 'root', factory: () => renderQuizCardFile },
);

export interface QuizShareCard {
  title: string;
  text: string;
  url: string;
  kicker: string;
  date: string;
  scoreLabel: string;
  score: string;
  streakLabel: string;
  streak: string;
  filename: string;
}

export type QuizShareOutcome = 'shared' | 'copied' | 'cancelled' | 'error';

export function quizShareUrl(origin: string = window.location.origin): string {
  return new URL('/quiz', origin).href;
}

export function formatQuizDate(dateKey: string, language: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(language, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function shareClipboardText(text: string, url: string): string {
  const body = text.trim();
  const link = url.trim();
  if (!link || body.includes(link)) return body;
  return `${body}\n${link}`;
}

export async function shareQuizCard(
  card: Pick<QuizShareCard, 'title' | 'text' | 'url'>,
  file: File | null,
): Promise<QuizShareOutcome> {
  if (typeof navigator.share === 'function') {
    if (
      file &&
      acceptsShare({
        title: card.title,
        text: shareClipboardText(card.text, card.url),
        files: [file],
      })
    ) {
      try {
        await navigator.share({
          title: card.title,
          text: shareClipboardText(card.text, card.url),
          files: [file],
        });
        return 'shared';
      } catch (error) {
        if (isAbort(error)) return 'cancelled';
      }
    }
    if (acceptsShare({ title: card.title, text: card.text, url: card.url })) {
      try {
        await navigator.share({ title: card.title, text: card.text, url: card.url });
        return 'shared';
      } catch (error) {
        if (isAbort(error)) return 'cancelled';
      }
    }
  }
  try {
    await navigator.clipboard.writeText(shareClipboardText(card.text, card.url));
    return 'copied';
  } catch {
    return 'error';
  }
}

export function renderQuizCardFile(card: QuizShareCard): File | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 600;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#0e1012';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#2bb3ac';
    ctx.fillRect(0, 0, 16, height);
    ctx.textBaseline = 'top';
    const left = 72;
    const max = width - left - 56;
    ctx.fillStyle = '#2bb3ac';
    ctx.font = '600 30px sans-serif';
    ctx.fillText(clip(ctx, card.kicker, max), left, 64);
    ctx.fillStyle = '#9aa3a8';
    ctx.font = '32px sans-serif';
    if (card.date) ctx.fillText(clip(ctx, card.date, max), left, 118);
    const values = card.streak ? [card.score, card.streak] : [card.score];
    const labels = card.streak ? [card.scoreLabel, card.streakLabel] : [card.scoreLabel];
    values.forEach((value, index) => {
      const x = left + index * 460;
      ctx.fillStyle = '#f2f4f5';
      ctx.font = '800 108px sans-serif';
      ctx.fillText(clip(ctx, value, 420), x, 210);
      ctx.fillStyle = '#9aa3a8';
      ctx.font = '28px sans-serif';
      ctx.fillText(clip(ctx, labels[index] ?? '', 420), x, 336);
    });
    ctx.fillStyle = '#3fc7c0';
    ctx.font = '28px sans-serif';
    ctx.fillText(clip(ctx, card.url, max), left, 470);
    const blob = dataUrlToBlob(canvas.toDataURL('image/png'));
    if (!blob) return null;
    return new File([blob], card.filename, { type: 'image/png' });
  } catch {
    return null;
  }
}

function dataUrlToBlob(url: string): Blob | null {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(url);
  if (!match) return null;
  const type = match[1] || 'image/png';
  const data = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
  return new Blob([bytes], { type });
}

function acceptsShare(data: ShareData): boolean {
  if (typeof navigator.canShare !== 'function') return true;
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

function isAbort(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'name' in error && error.name === 'AbortError';
}

function clip(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (!text || ctx.measureText(text).width <= max) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > max) end -= 1;
  return `${text.slice(0, end)}…`;
}
