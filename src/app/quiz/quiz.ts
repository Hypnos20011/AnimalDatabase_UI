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

export const QUIZ_RANDOM = new InjectionToken<() => number>('QUIZ_RANDOM', {
  providedIn: 'root',
  factory: () => Math.random,
});

export interface QuizRound {
  answer: Animal;
  choices: Animal[];
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
  private animals: Animal[] = [];
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
  best = signal(0);

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
        this.animals = animals;
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
    const byId = new Map(this.playable().map((animal) => [animal.id, animal]));
    const answer = byId.get(current.answer.id);
    const choices = current.choices.map((choice) => byId.get(choice.id));
    if (!answer || !hasPhoto(answer) || choices.some((choice) => !choice)) return false;
    this.round.set({ answer, choices: choices as Animal[] });
    return true;
  }

  private playable(): Animal[] {
    return this.animals.map((animal) =>
      this.brokenPhotos.has(animal.id) ? { ...animal, thumbnailUrl: null } : animal,
    );
  }

  private startRound(): void {
    const previous = this.round()?.answer.id;
    const avoid = new Set(previous === undefined ? [] : [previous]);
    this.round.set(buildRound(this.playable(), this.random, avoid));
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
      this.best.update((n) => Math.max(n, this.streak()));
    } else {
      this.streak.set(0);
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
}
