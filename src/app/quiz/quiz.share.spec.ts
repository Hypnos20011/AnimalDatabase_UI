import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { QUIZ_FACT_LIST } from './quiz-facts';
import { buildDailyPlan, Quiz, QUIZ_DAILY_ROUNDS, QUIZ_RANDOM, quizDateKey } from './quiz';
import {
  formatQuizDate,
  QUIZ_CARD_FILE,
  QUIZ_SHARE_STATUS_MS,
  QuizShareCard,
  quizShareUrl,
  renderQuizCardFile,
  shareClipboardText,
  shareQuizCard,
} from './quiz-share';

function animal(id: number, commonName: string, thumbnailUrl: string | null = null): Animal {
  return { id, commonName, thumbnailUrl } as Animal;
}

const many = [
  animal(1, 'Okapi', 'https://example.org/okapi.jpg'),
  animal(2, 'Axolotl', 'https://example.org/axolotl.jpg'),
  animal(3, 'Aye-aye', 'https://example.org/aye.jpg'),
  animal(4, 'Shoebill', 'https://example.org/shoebill.jpg'),
  animal(5, 'Tapir', 'https://example.org/tapir.jpg'),
  animal(6, 'Lion', 'https://example.org/lion.jpg'),
  animal(7, 'Wolf', 'https://example.org/wolf.jpg'),
  animal(8, 'Kiwi', 'https://example.org/kiwi.jpg'),
];

const navigatorKeys = ['share', 'canShare', 'clipboard'] as const;

function mockNavigator(values: Partial<Record<(typeof navigatorKeys)[number], unknown>>) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
}

function callArg<T>(fn: { mock: { calls: readonly (readonly unknown[])[] } }): T {
  return fn.mock.calls[0][0] as T;
}

function cardFixture(overrides: Partial<QuizShareCard> = {}): QuizShareCard {
  return {
    title: 'Unusual Animals · Daily challenge',
    text: 'Unusual Animals daily challenge on November 5, 2026: 4/5. Streak 3.',
    url: 'https://animals.example/quiz',
    kicker: 'Unusual Animals · Daily challenge',
    date: 'November 5, 2026',
    scoreLabel: 'Score',
    score: '4/5',
    streakLabel: 'Streak',
    streak: '3',
    filename: 'unusual-animals-daily.png',
    ...overrides,
  };
}

describe('quiz share helpers', () => {
  afterEach(() => {
    for (const key of navigatorKeys) delete (navigator as unknown as Record<string, unknown>)[key];
  });

  it('formats the daily date without shifting the calendar day', () => {
    expect(formatQuizDate('2026-11-05', 'en')).toBe('November 5, 2026');
    expect(formatQuizDate('2026-11-05', 'de')).toBe('5. November 2026');
    expect(formatQuizDate('2026-11-05', 'fr')).toBe('5 novembre 2026');
    expect(formatQuizDate('tomorrow', 'en')).toBe('tomorrow');
  });

  it('adds the quiz link to clipboard text once', () => {
    expect(shareClipboardText('Score 4/5', 'https://animals.example/quiz')).toBe(
      'Score 4/5\nhttps://animals.example/quiz',
    );
    expect(shareClipboardText('https://animals.example/quiz', 'https://animals.example/quiz')).toBe(
      'https://animals.example/quiz',
    );
  });

  it('shares a generated image when the platform accepts files', async () => {
    const file = new File(['png'], 'unusual-animals-daily.png', { type: 'image/png' });
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, canShare: vi.fn(() => true), clipboard: { writeText } });

    await expect(shareQuizCard(cardFixture(), file)).resolves.toBe('shared');

    expect(share).toHaveBeenCalledWith({
      title: 'Unusual Animals · Daily challenge',
      text: 'Unusual Animals daily challenge on November 5, 2026: 4/5. Streak 3.\nhttps://animals.example/quiz',
      files: [file],
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('shares text when the platform rejects a file', async () => {
    const file = new File(['png'], 'unusual-animals-daily.png', { type: 'image/png' });
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({
      share,
      canShare: vi.fn((data: ShareData) => !data.files),
      clipboard: { writeText },
    });

    await expect(shareQuizCard(cardFixture(), file)).resolves.toBe('shared');

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      title: 'Unusual Animals · Daily challenge',
      text: 'Unusual Animals daily challenge on November 5, 2026: 4/5. Streak 3.',
      url: 'https://animals.example/quiz',
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('does nothing when the user cancels the share sheet', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, clipboard: { writeText } });

    await expect(shareQuizCard(cardFixture(), null)).resolves.toBe('cancelled');

    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the result when sharing is unavailable', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ clipboard: { writeText } });

    await expect(shareQuizCard(cardFixture(), null)).resolves.toBe('copied');

    expect(writeText).toHaveBeenCalledWith(
      'Unusual Animals daily challenge on November 5, 2026: 4/5. Streak 3.\nhttps://animals.example/quiz',
    );
  });

  it('copies the result when sharing fails', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, clipboard: { writeText } });

    await expect(shareQuizCard(cardFixture(), null)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalled();
  });

  it('reports an error when sharing and copying both fail', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    mockNavigator({
      share,
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
    });

    await expect(shareQuizCard(cardFixture(), null)).resolves.toBe('error');
  });

  it('reports an error when no clipboard is available', async () => {
    mockNavigator({ clipboard: undefined });

    await expect(shareQuizCard(cardFixture(), null)).resolves.toBe('error');
  });

  it('returns null or a png card without throwing', () => {
    const result = renderQuizCardFile(cardFixture());
    if (result) {
      expect(result.type).toBe('image/png');
      expect(result.name).toBe('unusual-animals-daily.png');
    } else {
      expect(result).toBeNull();
    }
  });
});

describe('Quiz share card', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    for (const key of navigatorKeys) delete (navigator as unknown as Record<string, unknown>)[key];
  });

  async function setup(cardFile = vi.fn(() => null as File | null)) {
    TestBed.configureTestingModule({
      imports: [Quiz],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of(many)) } },
        { provide: QUIZ_RANDOM, useValue: () => 0 },
        { provide: QUIZ_CARD_FILE, useValue: cardFile },
      ],
    });
    const fixture = TestBed.createComponent(Quiz);
    const element = fixture.nativeElement as HTMLElement;
    const refresh = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    await refresh();
    const choices = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button.choice'));
    const choice = (name: string) =>
      choices().find((button) => button.textContent!.includes(name))!;
    const card = () => element.querySelector<HTMLElement>('[data-share="card"]');
    const dailyStatus = () => element.querySelector<HTMLElement>('[data-share-status="daily"]')!;
    const bestStatus = () => element.querySelector<HTMLElement>('[data-share-status="best"]')!;
    const bestButton = () => element.querySelector<HTMLButtonElement>('button.share-best');
    return {
      fixture,
      element,
      refresh,
      choices,
      choice,
      card,
      dailyStatus,
      bestStatus,
      bestButton,
      cardFile,
      component: fixture.componentInstance,
    };
  }

  async function finishDaily(ctx: Awaited<ReturnType<typeof setup>>, missLast = false) {
    const plan = buildDailyPlan(QUIZ_FACT_LIST, many, quizDateKey())!;
    ctx.element.querySelector<HTMLButtonElement>('button.daily-challenge')!.click();
    await ctx.refresh();
    for (let i = 0; i < plan.length; i++) {
      const answer = plan[i].answer.commonName;
      if (missLast && i === plan.length - 1) {
        ctx
          .choices()
          .find((button) => !button.textContent!.includes(answer))!
          .click();
      } else {
        ctx.choice(answer).click();
      }
      await ctx.refresh();
      ctx.element.querySelector<HTMLButtonElement>('button.next')!.click();
      await ctx.refresh();
    }
    return plan;
  }

  function names(plan: { answer: { commonName: string }; choices: { commonName: string }[] }[]) {
    return plan.flatMap((round) => round.choices.map((choice) => choice.commonName));
  }

  it('shows a result card with date, score, streak and quiz link and no answers', async () => {
    const ctx = await setup();
    const plan = await finishDaily(ctx, true);
    const card = ctx.card()!;

    expect(plan).toHaveLength(QUIZ_DAILY_ROUNDS);
    expect(document.activeElement).toBe(card);
    expect(card.getAttribute('tabindex')).toBe('-1');
    expect(card.querySelector('#daily-card-title')!.textContent).toBe(
      'Unusual Animals · Daily challenge',
    );
    expect(card.querySelector('[data-share="date"]')!.textContent).toBe(
      formatQuizDate(quizDateKey(), 'en'),
    );
    expect(card.querySelector('[data-share="score"]')!.textContent).toContain('4/5');
    expect(card.querySelector('[data-share="score"]')!.textContent).toContain('Score');
    expect(card.querySelector('[data-share="streak"]')!.textContent).toContain('4');
    expect(card.querySelector('[data-share="streak"]')!.textContent).toContain('Streak');
    const link = card.querySelector<HTMLAnchorElement>('[data-share="link"]')!;
    expect(link.textContent!.trim()).toBe(quizShareUrl());
    expect(link.getAttribute('href')).toBe('/quiz');
    const share = card.querySelector<HTMLButtonElement>('button.share-result')!;
    expect(share.getAttribute('type')).toBe('button');
    expect(share.getAttribute('aria-label')).toBe('Share result');
    expect(share.textContent).toContain('Share result');
    expect(ctx.dailyStatus().getAttribute('role')).toBe('status');
    expect(ctx.dailyStatus().getAttribute('aria-live')).toBe('polite');
    expect(ctx.dailyStatus().textContent!.trim()).toBe('');
    for (const name of names(plan)) expect(card.textContent).not.toContain(name);
    expect(ctx.element.querySelector('[data-stat="streak"]')!.textContent!.trim()).toBe('0');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    await ctx.refresh();
    expect(ctx.card()).not.toBeNull();
    expect(card.querySelector('[data-share="score"]')!.textContent).toContain('4/5');
  });

  it('shares the result image when the platform can share files', async () => {
    const file = new File(['png'], 'unusual-animals-daily.png', { type: 'image/png' });
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, canShare: vi.fn(() => true), clipboard: { writeText } });
    const ctx = await setup(vi.fn(() => file));
    const plan = await finishDaily(ctx);

    await ctx.component.shareDaily();
    ctx.fixture.detectChanges();

    const shared = callArg<QuizShareCard>(ctx.cardFile);
    expect(shared.score).toBe('5/5');
    expect(shared.streak).toBe('5');
    expect(shared.url).toBe(quizShareUrl());
    expect(shared.filename).toBe('unusual-animals-daily.png');
    expect(shared.text).toContain(formatQuizDate(quizDateKey(), 'en'));
    for (const name of names(plan)) {
      expect(shared.text).not.toContain(name);
      expect(JSON.stringify(callArg<ShareData>(share))).not.toContain(name);
    }
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: shared.title,
        files: [file],
        text: expect.stringContaining(shared.url),
      }),
    );
    expect(writeText).not.toHaveBeenCalled();
    expect(ctx.dailyStatus().textContent!.trim()).toBe('');
  });

  it('does nothing when the user cancels sharing the result', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, clipboard: { writeText } });
    const ctx = await setup();
    await finishDaily(ctx);

    ctx.card()!.querySelector<HTMLButtonElement>('button.share-result')!.click();
    await ctx.fixture.whenStable();
    await Promise.resolve();
    ctx.fixture.detectChanges();

    expect(share).toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(ctx.dailyStatus().textContent!.trim()).toBe('');
    expect(ctx.dailyStatus().classList).not.toContain('is-error');
  });

  it('copies the result when sharing is not supported', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ clipboard: { writeText } });
    const ctx = await setup();
    await finishDaily(ctx);

    await ctx.component.shareDaily();
    ctx.fixture.detectChanges();

    const copied = callArg<string>(writeText);
    expect(copied).toContain('5/5');
    expect(copied).toContain('Streak 5');
    expect(copied).toContain(formatQuizDate(quizDateKey(), 'en'));
    expect(copied).toContain(quizShareUrl());
    expect(ctx.dailyStatus().textContent!.trim()).toBe('Copied to clipboard');
    expect(ctx.dailyStatus().classList).not.toContain('is-error');
  });

  it('falls back to the clipboard when sharing the result fails', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, clipboard: { writeText } });
    const ctx = await setup();
    await finishDaily(ctx);

    await ctx.component.shareDaily();
    ctx.fixture.detectChanges();

    expect(writeText).toHaveBeenCalled();
    expect(ctx.dailyStatus().textContent!.trim()).toBe('Copied to clipboard');
  });

  it('shows an error when the result cannot be shared or copied', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    mockNavigator({
      share,
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) },
    });
    const ctx = await setup();
    await finishDaily(ctx);

    await ctx.component.shareDaily();
    ctx.fixture.detectChanges();

    expect(ctx.dailyStatus().textContent!.trim()).toBe('Could not share or copy');
    expect(ctx.dailyStatus().classList).toContain('is-error');
  });

  it('shows an error when the result has no clipboard', async () => {
    mockNavigator({ clipboard: undefined });
    const ctx = await setup(
      vi.fn(() => {
        throw new Error('canvas failed');
      }),
    );
    await finishDaily(ctx);

    await ctx.component.shareDaily();
    ctx.fixture.detectChanges();

    expect(ctx.dailyStatus().textContent!.trim()).toBe('Could not share or copy');
  });

  it('clears the copied message after a few seconds', async () => {
    vi.useFakeTimers();
    mockNavigator({ clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
    const ctx = await setup();
    await finishDaily(ctx);

    await ctx.component.shareDaily();
    ctx.fixture.detectChanges();
    expect(ctx.dailyStatus().textContent!.trim()).toBe('Copied to clipboard');

    vi.advanceTimersByTime(QUIZ_SHARE_STATUS_MS);
    ctx.fixture.detectChanges();
    expect(ctx.dailyStatus().textContent!.trim()).toBe('');
  });

  it('shares the personal best from the score row without a second card', async () => {
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    const file = new File(['png'], 'unusual-animals-streak.png', { type: 'image/png' });
    mockNavigator({ share, canShare: vi.fn(() => true), clipboard: { writeText } });
    const ctx = await setup(vi.fn(() => file));

    expect(ctx.bestButton()).toBeNull();
    expect(ctx.card()).toBeNull();
    ctx.choice('Okapi').click();
    await ctx.refresh();
    ctx.element.querySelector<HTMLButtonElement>('button.next')!.click();
    await ctx.refresh();

    const button = ctx.bestButton()!;
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Share best streak');
    expect(ctx.element.querySelectorAll('[data-share="card"]')).toHaveLength(0);
    expect(ctx.bestStatus().getAttribute('aria-live')).toBe('polite');

    const event = new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    ctx.component.onKey(event);
    await ctx.refresh();
    expect(event.target).toBe(button);
    expect(ctx.element.querySelector('[data-stat="score"]')!.textContent!.trim()).toBe('1/1');

    await ctx.component.shareBest();
    ctx.fixture.detectChanges();

    const shared = callArg<QuizShareCard>(ctx.cardFile);
    expect(shared.score).toBe('1');
    expect(shared.text).toContain('1');
    expect(shared.text).not.toContain('Okapi');
    expect(shared.url).toBe(quizShareUrl());
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: [file], text: expect.stringContaining(quizShareUrl()) }),
    );
    expect(writeText).not.toHaveBeenCalled();
    expect(ctx.bestStatus().textContent!.trim()).toBe('');
  });

  it('uses German and French copy on the result card', async () => {
    localStorage.setItem('language', 'de');
    const ctx = await setup();
    await finishDaily(ctx);

    expect(ctx.card()!.textContent).toContain('Unusual Animals · Tägliche Herausforderung');
    expect(ctx.card()!.querySelector('[data-share="date"]')!.textContent).toBe(
      formatQuizDate(quizDateKey(), 'de'),
    );
    expect(ctx.card()!.querySelector('button.share-result')!.textContent).toContain(
      'Ergebnis teilen',
    );
    expect(ctx.bestButton()!.getAttribute('aria-label')).toBe('Beste Serie teilen');

    TestBed.inject(LanguageService).setLanguage('fr');
    await ctx.refresh();

    expect(ctx.card()!.textContent).toContain('Unusual Animals · Défi du jour');
    expect(ctx.card()!.querySelector('[data-share="date"]')!.textContent).toBe(
      formatQuizDate(quizDateKey(), 'fr'),
    );
    expect(ctx.card()!.querySelector('button.share-result')!.getAttribute('aria-label')).toBe(
      'Partager le résultat',
    );
    expect(ctx.bestButton()!.getAttribute('aria-label')).toBe('Partager la meilleure série');
  });
});
