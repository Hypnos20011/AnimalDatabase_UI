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

export const QUIZ_CHOICES = 4;

export const QUIZ_BEST_STORAGE = 'animaldb.quiz.bestStreak';

export const QUIZ_MISSED_STORAGE = 'animaldb.quiz.missed';

export const QUIZ_RANDOM = new InjectionToken<() => number>('QUIZ_RANDOM', {
  providedIn: 'root',
  factory: () => Math.random,
});

export interface QuizRound {
  answer: Animal;
  choices: Animal[];
}

export interface QuizFilter {
  taxonomicClass: string;
  habitatType: string;
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
        parsed.filter((id): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0),
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

function distinctValues(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => !!value?.trim()))];
}

function nameKey(animal: Animal): string {
  return animal.commonName.trim().toLowerCase();
}

export function hasPhoto(animal: Animal): boolean {
  return !!animal.thumbnailUrl?.trim();
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

export function buildRound(
  animals: readonly Animal[],
  random: () => number = Math.random,
  avoid: ReadonlySet<number> = new Set(),
): QuizRound | null {
  const named = animals.filter((animal) => animal.commonName?.trim());
  if (new Set(named.map(nameKey)).size < QUIZ_CHOICES) return null;
  const withPhoto = named.filter(hasPhoto);
  const fresh = withPhoto.filter((animal) => !avoid.has(animal.id));
  const pool = fresh.length > 0 ? fresh : withPhoto;
  if (pool.length === 0) return null;
  const answer = pick(pool, random);
  const wrong = new Map<string, Animal>([[nameKey(answer), answer]]);
  for (const animal of shuffle(named, random)) {
    if (wrong.size === QUIZ_CHOICES) break;
    if (!wrong.has(nameKey(animal))) wrong.set(nameKey(animal), animal);
  }
  return { answer, choices: shuffle([...wrong.values()], random) };
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
  protected i18n = inject(LanguageService);
  readonly srcset = wikimediaSrcset;

  private request?: Subscription;
  private animals = signal<Animal[]>([]);
  private brokenPhotos = new Set<number>();
  private nextButton = viewChild<ElementRef<HTMLButtonElement>>('nextButton');
  private choiceButtons = viewChildren<ElementRef<HTMLButtonElement>>('choiceButton');

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
  classFilter = signal('');
  habitatFilter = signal('');

  missedCount = computed(() => this.missedIds().length);
  filterActive = computed(() => !!this.classFilter() || !!this.habitatFilter());
  poolRestricted = computed(() => this.practiceMode() || this.filterActive());
  classes = computed(() => this.sortedLabels('class', this.animals().map((a) => a.taxonomicClass)));
  habitats = computed(() => this.sortedLabels('habitat', this.animals().map((a) => a.habitatType)));

  answered = computed(() => this.picked() !== null);
  correct = computed(() => this.picked() !== null && this.picked() === this.round()?.answer.id);

  constructor() {
    effect(() => {
      const language = this.i18n.language();
      untracked(() => this.load(language));
    });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
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
        if (!this.keepRound()) this.startRound();
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private keepRound(): boolean {
    const current = this.round();
    if (!current) return false;
    const byId = new Map(this.pool().map((animal) => [animal.id, animal]));
    const answer = byId.get(current.answer.id);
    const choices = current.choices.map((choice) => byId.get(choice.id));
    if (!answer || !hasPhoto(answer) || choices.some((choice) => !choice)) return false;
    this.round.set({ answer, choices: choices as Animal[] });
    return true;
  }

  private pool(): Animal[] {
    const filter = { taxonomicClass: this.classFilter(), habitatType: this.habitatFilter() };
    const missed = new Set(this.missedIds());
    return this.animals()
      .filter((animal) => matchesFilter(animal, filter))
      .filter((animal) => !this.practiceMode() || missed.has(animal.id))
      .map((animal) =>
        this.brokenPhotos.has(animal.id) ? { ...animal, thumbnailUrl: null } : animal,
      );
  }

  private sortedLabels(group: 'class' | 'habitat', values: (string | null)[]): string[] {
    const language = this.i18n.language();
    return distinctValues(values).sort((a, b) =>
      this.i18n.tValue(group, a).localeCompare(this.i18n.tValue(group, b), language),
    );
  }

  private dropMissingFilters(): void {
    if (this.classFilter() && !this.classes().includes(this.classFilter())) this.classFilter.set('');
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
    if (value === this.classFilter()) return;
    this.classFilter.set(value);
    this.startRound();
  }

  setHabitatFilter(value: string): void {
    if (value === this.habitatFilter()) return;
    this.habitatFilter.set(value);
    this.startRound();
  }

  clearFilters(): void {
    this.classFilter.set('');
    this.habitatFilter.set('');
    this.next();
  }

  setPracticeMode(active: boolean): void {
    if (active === this.practiceMode()) return;
    this.practiceMode.set(active);
    this.startRound();
  }

  private startRound(): void {
    const previous = this.round()?.answer.id;
    const avoid = new Set(previous === undefined ? [] : [previous]);
    this.round.set(buildRound(this.pool(), this.random, avoid));
    this.picked.set(null);
  }

  private focusLater(target: () => HTMLElement | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }

  choose(choice: Animal): void {
    const round = this.round();
    if (!round || this.answered()) return;
    this.picked.set(choice.id);
    this.played.update((n) => n + 1);
    if (choice.id === round.answer.id) {
      this.score.update((n) => n + 1);
      this.streak.update((n) => n + 1);
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
    this.startRound();
    this.focusLater(() => this.choiceButtons()[0]?.nativeElement);
  }

  restart(): void {
    this.score.set(0);
    this.played.set(0);
    this.streak.set(0);
    this.next();
  }

  photoFailed(): void {
    const round = this.round();
    if (!round || this.answered()) return;
    this.brokenPhotos.add(round.answer.id);
    this.startRound();
  }

  onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || this.answered()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const choice = this.round()?.choices[Number(event.key) - 1];
    if (!choice) return;
    event.preventDefault();
    this.choose(choice);
  }

  resultText(round: QuizRound): string {
    return this.i18n.t(this.correct() ? 'quiz.correct' : 'quiz.wrong', {
      name: round.answer.commonName,
    });
  }

  emptyText(): string {
    return this.i18n.t(this.practiceMode() ? 'quiz.practice.empty' : 'quiz.filter.empty');
  }
}
