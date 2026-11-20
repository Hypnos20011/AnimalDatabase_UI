import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  Injector,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { Language } from '../shared/i18n/languages';
import { wikimediaSrcset } from '../shared/wikimedia-image';
import {
  formatQuizDate,
  QUIZ_CARD_FILE,
  QUIZ_SHARE_STATUS_MS,
  QuizShareCard,
  quizShareUrl,
  shareQuizCard,
} from './quiz-share';
import { QUIZ_FACT_LIST, QuizFact, quizFactText } from './quiz-facts';

export const QUIZ_CHOICES = 4;

export const QUIZ_BEST_STORAGE = 'animaldb.quiz.bestStreak';

export const QUIZ_MISSED_STORAGE = 'animaldb.quiz.missed';

export const QUIZ_DAILY_STORAGE = 'animaldb.quiz.dailyBest';

export const QUIZ_DAILY_ROUNDS = 5;

export const QUIZ_DAILY_TZ = 'Europe/Vienna';

export const QUIZ_RANDOM = new InjectionToken<() => number>('QUIZ_RANDOM', {
  providedIn: 'root',
  factory: () => Math.random,
});

export const QUIZ_FACTS = new InjectionToken<readonly QuizFact[]>('QUIZ_FACTS', {
  providedIn: 'root',
  factory: () => QUIZ_FACT_LIST,
});

export interface QuizRound {
  fact: QuizFact;
  answer: Animal;
  choices: Animal[];
}

export interface QuizFilter {
  taxonomicClass: string;
  habitatType: string;
}

export interface DailyBest {
  date: string;
  score: number;
  streak: number;
}

export function matchesFilter(animal: Animal, filter: QuizFilter): boolean {
  return (
    (!filter.taxonomicClass || animal.taxonomicClass === filter.taxonomicClass) &&
    (!filter.habitatType || animal.habitatType === filter.habitatType)
  );
}

export function readBestStreak(): number {
  try {
    const stored = Number(localStorage.getItem(QUIZ_BEST_STORAGE));
    return Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
}

function saveBestStreak(best: number): void {
  try {
    localStorage.setItem(QUIZ_BEST_STORAGE, String(best));
  } catch {}
}

export function readMissedIds(): number[] {
  try {
    const raw = localStorage.getItem(QUIZ_MISSED_STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0,
        ),
      ),
    ];
  } catch {
    return [];
  }
}

function saveMissedIds(ids: number[]): void {
  try {
    if (ids.length === 0) localStorage.removeItem(QUIZ_MISSED_STORAGE);
    else localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify(ids));
  } catch {}
}

export function quizDateKey(now: Date = new Date(), timeZone: string = QUIZ_DAILY_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function seedFromDate(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function readDailyBest(today: string = quizDateKey()): DailyBest | null {
  try {
    const raw = localStorage.getItem(QUIZ_DAILY_STORAGE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyBest>;
    if (!parsed || parsed.date !== today) return null;
    const score = Number(parsed.score);
    const streak = Number(parsed.streak);
    if (!Number.isSafeInteger(score) || score < 0) return null;
    if (!Number.isSafeInteger(streak) || streak < 0) return null;
    return { date: today, score, streak };
  } catch {
    return null;
  }
}

function saveDailyBest(best: DailyBest): void {
  try {
    localStorage.setItem(QUIZ_DAILY_STORAGE, JSON.stringify(best));
  } catch {}
}

function isBetterDaily(candidate: DailyBest, current: DailyBest | null): boolean {
  if (!current || current.date !== candidate.date) return true;
  if (candidate.score !== current.score) return candidate.score > current.score;
  return candidate.streak > current.streak;
}

function distinctValues(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => !!value?.trim()))];
}

function nameKey(animal: Animal): string {
  return animal.commonName.trim().toLowerCase();
}

export function hasPhoto(animal: Animal): boolean {
  return !!animal.thumbnailUrl?.trim();
}

function normName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scientificMatch(factName: string, animalName: string): boolean {
  const fact = normName(factName);
  const animal = normName(animalName);
  if (!fact || !animal) return false;
  if (fact === animal) return true;
  if (!fact.includes(' ')) return animal.split(' ')[0] === fact;
  return false;
}

export function matchFactAnimal(fact: QuizFact, animals: readonly Animal[]): Animal | null {
  const byScience = animals.find(
    (animal) =>
      !!animal.scientificName && scientificMatch(fact.scientificName, animal.scientificName),
  );
  if (byScience) return byScience;
  const common = normName(fact.commonName);
  return animals.find((animal) => normName(animal.commonName) === common) ?? null;
}

function linkedFacts(
  facts: readonly QuizFact[],
  animals: readonly Animal[],
): { fact: QuizFact; answer: Animal }[] {
  const linked: { fact: QuizFact; answer: Animal }[] = [];
  for (const fact of facts) {
    const answer = matchFactAnimal(fact, animals);
    if (answer) linked.push({ fact, answer });
  }
  return linked;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function orderFactCycle<T extends { id: number }>(
  items: readonly T[],
  random: () => number,
  previousId?: number,
): T[] {
  if (items.length === 0) return [];
  const order = shuffle(items, random);
  if (previousId != null && order.length > 1 && order[0].id === previousId) {
    order.push(order.shift()!);
  }
  return order;
}

export function buildFactRound(
  facts: readonly QuizFact[],
  animals: readonly Animal[],
  random: () => number = Math.random,
  avoid: ReadonlySet<number> = new Set(),
): QuizRound | null {
  const named = animals.filter((animal) => animal.commonName?.trim());
  if (new Set(named.map(nameKey)).size < QUIZ_CHOICES) return null;
  const linked = linkedFacts(facts, named);
  const fresh = linked.filter((item) => !avoid.has(item.answer.id));
  const pool = fresh.length > 0 ? fresh : linked;
  if (pool.length === 0) return null;
  const picked = pick(pool, random);
  const choices = new Map<string, Animal>([[nameKey(picked.answer), picked.answer]]);
  for (const animal of shuffle(named, random)) {
    if (choices.size === QUIZ_CHOICES) break;
    if (!choices.has(nameKey(animal))) choices.set(nameKey(animal), animal);
  }
  if (choices.size < QUIZ_CHOICES) return null;
  return {
    fact: picked.fact,
    answer: picked.answer,
    choices: shuffle([...choices.values()], random),
  };
}

export function buildDailyPlan(
  facts: readonly QuizFact[],
  animals: readonly Animal[],
  dateKey: string,
  count: number = QUIZ_DAILY_ROUNDS,
): QuizRound[] | null {
  const stable = [...animals].sort((a, b) => a.id - b.id);
  const linked = linkedFacts(facts, stable).sort(
    (a, b) =>
      a.fact.scientificName.localeCompare(b.fact.scientificName) || a.answer.id - b.answer.id,
  );
  if (linked.length < count) return null;
  if (
    new Set(stable.filter((animal) => animal.commonName?.trim()).map(nameKey)).size < QUIZ_CHOICES
  ) {
    return null;
  }
  const random = mulberry32(seedFromDate(dateKey));
  const plan: QuizRound[] = [];
  const used = new Set<number>();
  for (const item of shuffle(linked, random)) {
    if (plan.length === count) break;
    if (used.has(item.answer.id)) continue;
    const round = buildFactRound([item.fact], stable, random, used);
    if (!round) continue;
    plan.push(round);
    used.add(round.answer.id);
  }
  return plan.length === count ? plan : null;
}

@Component({
  selector: 'app-quiz',
  imports: [RouterLink],
  templateUrl: './quiz.html',
  styleUrl: './quiz.css',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class Quiz {
  private animalService = inject(AnimalService);
  private random = inject(QUIZ_RANDOM);
  private injector = inject(Injector);
  private cardFile = inject(QUIZ_CARD_FILE);
  private facts = inject(QUIZ_FACTS);
  protected i18n = inject(LanguageService);
  readonly srcset = wikimediaSrcset;
  readonly dailyTotal = QUIZ_DAILY_ROUNDS;

  private request?: Subscription;
  private animals = signal<Animal[]>([]);
  private brokenPhotos = new Set<number>();
  private nextButton = viewChild<ElementRef<HTMLButtonElement>>('nextButton');
  private choiceButtons = viewChildren<ElementRef<HTMLButtonElement>>('choiceButton');
  private resultCard = viewChild<ElementRef<HTMLElement>>('resultCard');
  private shareTimers = new Map<'daily' | 'best', ReturnType<typeof setTimeout>>();
  private shareLock: 'daily' | 'best' | null = null;
  private factQueue: QuizFact[] = [];
  private factQueueKey = '';

  round = signal<QuizRound | null>(null);
  picked = signal<number | null>(null);
  loading = signal(true);
  error = signal(false);
  score = signal(0);
  played = signal(0);
  streak = signal(0);
  best = signal(readBestStreak());
  missedIds = signal<number[]>(readMissedIds());
  practiceMode = signal(false);
  dailyMode = signal(false);
  dailyPlan = signal<QuizRound[] | null>(null);
  dailyIndex = signal(0);
  dailyFinished = signal(false);
  dailyBest = signal<DailyBest | null>(readDailyBest());
  runBestStreak = signal(0);
  solutionShown = signal(false);
  classFilter = signal('');
  habitatFilter = signal('');
  dailyShareStatus = signal<'copied' | 'error' | null>(null);
  bestShareStatus = signal<'copied' | 'error' | null>(null);

  missedCount = computed(() => this.missedIds().length);
  filterActive = computed(() => !!this.classFilter() || !!this.habitatFilter());
  poolRestricted = computed(
    () => !this.dailyMode() && (this.practiceMode() || this.filterActive()),
  );
  classes = computed(() =>
    this.sortedLabels(
      'class',
      this.animals().map((a) => a.taxonomicClass),
    ),
  );
  habitats = computed(() =>
    this.sortedLabels(
      'habitat',
      this.animals().map((a) => a.habitatType),
    ),
  );
  dailyQuestion = computed(() => this.dailyIndex() + 1);
  showFilters = computed(
    () =>
      !this.dailyMode() &&
      (this.classes().length > 0 || this.habitats().length > 0 || this.missedCount() > 0),
  );

  answered = computed(() => this.picked() !== null || this.solutionShown());
  correct = computed(() => this.picked() !== null && this.picked() === this.round()?.answer.id);
  dailyLast = computed(
    () => this.dailyMode() && this.dailyIndex() >= (this.dailyPlan()?.length ?? 0) - 1,
  );
  dailyShareMessage = computed(() => this.shareMessage(this.dailyShareStatus()));
  bestShareMessage = computed(() => this.shareMessage(this.bestShareStatus()));

  constructor() {
    effect(() => {
      const language = this.i18n.language();
      untracked(() => this.load(language));
    });
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      for (const timer of this.shareTimers.values()) clearTimeout(timer);
    });
  }

  private load(language: Language): void {
    this.request?.unsubscribe();
    this.error.set(false);
    this.loading.set(true);
    this.request = this.animalService.getAll(language).subscribe({
      next: (animals) => {
        this.loading.set(false);
        this.animals.set(animals);
        this.dropMissingFilters();
        if (this.dailyMode()) {
          if (!this.refreshDailyPlan()) this.beginDaily();
          return;
        }
        if (!this.keepRound()) this.startRound();
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private withBroken(animals: readonly Animal[]): Animal[] {
    return animals.map((animal) =>
      this.brokenPhotos.has(animal.id) ? { ...animal, thumbnailUrl: null } : animal,
    );
  }

  private remapRound(round: QuizRound, byId: Map<number, Animal>): QuizRound | null {
    const answer = byId.get(round.answer.id);
    const choices = round.choices.map((choice) => byId.get(choice.id));
    if (!answer || choices.some((choice) => !choice)) return null;
    return { fact: round.fact, answer, choices: choices as Animal[] };
  }

  private keepRound(): boolean {
    const current = this.round();
    if (!current) return false;
    const byId = new Map(this.pool().map((animal) => [animal.id, animal]));
    const remapped = this.remapRound(current, byId);
    if (!remapped) return false;
    this.round.set(remapped);
    return true;
  }

  private refreshDailyPlan(): boolean {
    const current = this.dailyPlan();
    if (!current) return false;
    if (this.dailyFinished()) return true;
    const byId = new Map(this.withBroken(this.animals()).map((animal) => [animal.id, animal]));
    const remapped: QuizRound[] = [];
    for (const round of current) {
      const next = this.remapRound(round, byId);
      if (!next) return false;
      remapped.push(next);
    }
    this.dailyPlan.set(remapped);
    const active = remapped[this.dailyIndex()];
    if (!active) return false;
    this.round.set(active);
    return true;
  }

  private pool(): Animal[] {
    if (this.dailyMode()) return this.withBroken(this.animals());
    const filter = { taxonomicClass: this.classFilter(), habitatType: this.habitatFilter() };
    const missed = new Set(this.missedIds());
    return this.withBroken(this.animals())
      .filter((animal) => matchesFilter(animal, filter))
      .filter((animal) => !this.practiceMode() || missed.has(animal.id));
  }

  private sortedLabels(group: 'class' | 'habitat', values: (string | null)[]): string[] {
    const language = this.i18n.language();
    return distinctValues(values).sort((a, b) =>
      this.i18n.tValue(group, a).localeCompare(this.i18n.tValue(group, b), language),
    );
  }

  private dropMissingFilters(): void {
    if (this.classFilter() && !this.classes().includes(this.classFilter()))
      this.classFilter.set('');
    if (this.habitatFilter() && !this.habitats().includes(this.habitatFilter())) {
      this.habitatFilter.set('');
    }
  }

  private rememberMissed(ids: number[]): void {
    this.missedIds.set(ids);
    saveMissedIds(ids);
  }

  private addMissed(id: number): void {
    if (this.missedIds().includes(id)) return;
    this.rememberMissed([...this.missedIds(), id]);
  }

  private clearMissed(id: number): void {
    if (!this.missedIds().includes(id)) return;
    const next = this.missedIds().filter((missed) => missed !== id);
    this.rememberMissed(next);
    if (this.practiceMode() && next.length === 0) this.practiceMode.set(false);
  }

  setClassFilter(value: string): void {
    if (this.dailyMode() || value === this.classFilter()) return;
    this.classFilter.set(value);
    this.startRound();
  }

  setHabitatFilter(value: string): void {
    if (this.dailyMode() || value === this.habitatFilter()) return;
    this.habitatFilter.set(value);
    this.startRound();
  }

  clearFilters(): void {
    this.classFilter.set('');
    this.habitatFilter.set('');
    this.next();
  }

  setPracticeMode(active: boolean): void {
    if (this.dailyMode() || active === this.practiceMode()) return;
    this.practiceMode.set(active);
    this.startRound();
  }

  setDailyMode(active: boolean): void {
    if (active === this.dailyMode()) {
      if (active) this.beginDaily();
      return;
    }
    if (active) {
      this.practiceMode.set(false);
      this.dailyMode.set(true);
      this.beginDaily();
      return;
    }
    this.dailyMode.set(false);
    this.dailyPlan.set(null);
    this.dailyFinished.set(false);
    this.dailyIndex.set(0);
    this.startRound();
  }

  private beginDaily(): void {
    const date = quizDateKey();
    this.dailyBest.set(readDailyBest(date));
    this.dailyFinished.set(false);
    this.dailyIndex.set(0);
    this.score.set(0);
    this.played.set(0);
    this.streak.set(0);
    this.runBestStreak.set(0);
    this.solutionShown.set(false);
    this.picked.set(null);
    const plan = buildDailyPlan(this.facts, this.withBroken(this.animals()), date);
    this.dailyPlan.set(plan);
    this.round.set(plan?.[0] ?? null);
  }

  private finishDaily(): void {
    this.dailyFinished.set(true);
    const date = quizDateKey();
    const candidate: DailyBest = {
      date,
      score: this.score(),
      streak: this.runBestStreak(),
    };
    if (isBetterDaily(candidate, this.dailyBest())) {
      this.dailyBest.set(candidate);
      saveDailyBest(candidate);
    } else {
      this.dailyBest.set(readDailyBest(date));
    }
    this.focusLater(() => this.resultCard()?.nativeElement);
  }

  private startRound(): void {
    const previous = this.round()?.answer.id;
    this.solutionShown.set(false);
    this.picked.set(null);
    this.round.set(this.drawFactRound(previous));
  }

  private drawFactRound(previousId?: number): QuizRound | null {
    const animals = this.pool();
    const linked = linkedFacts(this.facts, animals);
    const key = linked
      .map((item) => item.answer.id)
      .sort((a, b) => a - b)
      .join(',');
    if (key !== this.factQueueKey) {
      this.factQueue = [];
      this.factQueueKey = key;
    }
    if (this.factQueue.length === 0) {
      this.factQueue = orderFactCycle(
        linked.map((item) => ({ id: item.answer.id, fact: item.fact })),
        this.random,
        previousId,
      ).map((item) => item.fact);
    }
    while (this.factQueue.length > 0) {
      const fact = this.factQueue.shift()!;
      const round = buildFactRound([fact], animals, this.random);
      if (round) return round;
    }
    return null;
  }

  private focusLater(target: () => HTMLElement | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }

  choose(choice: Animal): void {
    const round = this.round();
    if (!round || this.answered() || this.dailyFinished()) return;
    this.picked.set(choice.id);
    this.played.update((n) => n + 1);
    if (choice.id === round.answer.id) {
      this.score.update((n) => n + 1);
      this.streak.update((n) => n + 1);
      if (this.streak() > this.runBestStreak()) this.runBestStreak.set(this.streak());
      if (this.streak() > this.best()) {
        this.best.set(this.streak());
        saveBestStreak(this.best());
      }
      this.clearMissed(round.answer.id);
    } else {
      this.streak.set(0);
      this.addMissed(round.answer.id);
    }
    this.focusLater(() => this.nextButton()?.nativeElement);
  }

  next(): void {
    if (this.dailyMode()) {
      if (this.dailyFinished()) return;
      const plan = this.dailyPlan();
      if (!plan) return;
      if (this.dailyIndex() >= plan.length - 1) {
        this.finishDaily();
        return;
      }
      const index = this.dailyIndex() + 1;
      this.dailyIndex.set(index);
      this.round.set(plan[index]);
      this.solutionShown.set(false);
      this.picked.set(null);
      this.focusLater(() => this.choiceButtons()[0]?.nativeElement);
      return;
    }
    this.startRound();
    this.focusLater(() => this.choiceButtons()[0]?.nativeElement);
  }

  restart(): void {
    if (this.dailyMode()) {
      this.beginDaily();
      this.focusLater(() => this.choiceButtons()[0]?.nativeElement);
      return;
    }
    this.score.set(0);
    this.played.set(0);
    this.streak.set(0);
    this.next();
  }

  showSolution(): void {
    const round = this.round();
    if (!round || this.answered() || this.dailyFinished()) return;
    this.solutionShown.set(true);
    this.played.update((n) => n + 1);
    this.streak.set(0);
    this.addMissed(round.answer.id);
    this.focusLater(() => this.nextButton()?.nativeElement);
  }

  photoFailed(): void {
    const id = this.round()?.answer.id;
    if (id == null || this.dailyFinished()) return;
    this.brokenPhotos.add(id);
  }

  onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || this.answered() || this.dailyFinished()) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        'input, textarea, select, button.share-best, button.show-solution, .language, [contenteditable="true"]',
      )
    ) {
      return;
    }
    const choice = this.round()?.choices[Number(event.key) - 1];
    if (!choice) return;
    event.preventDefault();
    this.choose(choice);
  }

  resultText(round: QuizRound): string {
    if (this.picked() === null) {
      return this.i18n.t('quiz.revealed', { name: round.answer.commonName });
    }
    return this.i18n.t(this.correct() ? 'quiz.correct' : 'quiz.wrong', {
      name: round.answer.commonName,
    });
  }

  questionText(round: QuizRound): string {
    return quizFactText(round.fact.question, this.i18n.language());
  }

  factText(round: QuizRound): string {
    return quizFactText(round.fact.fact, this.i18n.language());
  }

  photoUrl(round: QuizRound): string | null {
    if (this.brokenPhotos.has(round.answer.id)) return null;
    const url = round.answer.thumbnailUrl?.trim();
    return url || null;
  }

  emptyText(): string {
    if (this.dailyMode()) return this.i18n.t('quiz.daily.empty');
    return this.i18n.t(this.practiceMode() ? 'quiz.practice.empty' : 'quiz.filter.empty');
  }

  dailyBestText(): string {
    const best = this.dailyBest();
    if (!best) return '';
    return this.i18n.t('quiz.daily.best', { score: best.score, total: this.dailyTotal });
  }

  dailyDoneText(): string {
    return this.i18n.t('quiz.daily.done', { score: this.score(), total: this.dailyTotal });
  }

  nextLabel(): string {
    if (this.dailyMode() && this.dailyLast()) return this.i18n.t('quiz.daily.finish');
    return this.i18n.t('quiz.next');
  }

  quizLink(): string {
    return quizShareUrl();
  }

  dailyDateLabel(): string {
    return formatQuizDate(quizDateKey(), this.i18n.language());
  }

  async shareDaily(): Promise<void> {
    if (this.shareLock || !this.dailyFinished()) return;
    await this.share(this.dailyShareCard(), 'daily');
  }

  async shareBest(): Promise<void> {
    if (this.shareLock || this.best() <= 0) return;
    await this.share(this.bestShareCard(), 'best');
  }

  private dailyShareCard(): QuizShareCard {
    const date = this.dailyDateLabel();
    const score = this.score();
    const streak = this.runBestStreak();
    return {
      title: this.i18n.t('quiz.share.cardTitle'),
      text: this.i18n.t('quiz.share.daily.text', {
        date,
        score,
        total: this.dailyTotal,
        streak,
      }),
      url: this.quizLink(),
      kicker: this.i18n.t('quiz.share.cardTitle'),
      date,
      scoreLabel: this.i18n.t('quiz.score'),
      score: `${score}/${this.dailyTotal}`,
      streakLabel: this.i18n.t('quiz.streak'),
      streak: String(streak),
      filename: 'unusual-animals-daily.png',
    };
  }

  private bestShareCard(): QuizShareCard {
    const streak = String(this.best());
    return {
      title: this.i18n.t('quiz.share.bestTitle'),
      text: this.i18n.t('quiz.share.best.text', { streak }),
      url: this.quizLink(),
      kicker: this.i18n.t('quiz.share.bestTitle'),
      date: this.i18n.t('quiz.title'),
      scoreLabel: this.i18n.t('quiz.best'),
      score: streak,
      streakLabel: '',
      streak: '',
      filename: 'unusual-animals-streak.png',
    };
  }

  private async share(card: QuizShareCard, which: 'daily' | 'best'): Promise<void> {
    this.shareLock = which;
    try {
      let file: File | null = null;
      try {
        file = this.cardFile(card);
      } catch {
        file = null;
      }
      const outcome = await shareQuizCard(card, file);
      if (outcome === 'cancelled') return;
      this.setShareStatus(
        which,
        outcome === 'copied' ? 'copied' : outcome === 'error' ? 'error' : null,
      );
    } finally {
      this.shareLock = null;
    }
  }

  private shareMessage(status: 'copied' | 'error' | null): string {
    if (status === 'copied') return this.i18n.t('quiz.share.copied');
    if (status === 'error') return this.i18n.t('quiz.share.error');
    return '';
  }

  private setShareStatus(which: 'daily' | 'best', status: 'copied' | 'error' | null): void {
    clearTimeout(this.shareTimers.get(which));
    const target = which === 'daily' ? this.dailyShareStatus : this.bestShareStatus;
    target.set(status);
    if (status) {
      this.shareTimers.set(
        which,
        setTimeout(() => target.set(null), QUIZ_SHARE_STATUS_MS),
      );
    }
  }
}
