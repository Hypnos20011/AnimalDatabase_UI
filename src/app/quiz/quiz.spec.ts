import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { buildRound, Quiz, QUIZ_RANDOM, shuffle } from './quiz';

function animal(id: number, commonName: string, thumbnailUrl: string | null = null): Animal {
  return { id, commonName, thumbnailUrl } as Animal;
}

const zoo = [
  animal(1, 'Okapi', 'https://example.org/okapi.jpg'),
  animal(2, 'Axolotl', 'https://example.org/axolotl.jpg'),
  animal(3, 'Aye-aye'),
  animal(4, 'Shoebill'),
  animal(5, 'Tapir'),
];

describe('buildRound', () => {
  const ids = (animals: Animal[]) => animals.map((a) => a.id).sort();

  it('picks an answer with a photo and three other names', () => {
    const round = buildRound(zoo, () => 0)!;

    expect(round.answer.id).toBe(1);
    expect(round.choices).toHaveLength(4);
    expect(round.choices).toContain(round.answer);
    expect(new Set(round.choices.map((a) => a.commonName)).size).toBe(4);
  });

  it('never uses the same name twice', () => {
    const twins = [
      animal(1, 'Okapi', 'x'),
      animal(2, ' okapi '),
      animal(3, 'A'),
      animal(4, 'B'),
      animal(5, 'C'),
    ];
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(ids(buildRound(twins, () => r)!.choices)).not.toContain(2);
    }
  });

  it('avoids the last answer when it can', () => {
    expect(buildRound(zoo, () => 0, new Set([1]))!.answer.id).toBe(2);
    const onePhoto = zoo.map((a) => (a.id === 1 ? a : { ...a, thumbnailUrl: null }));
    expect(buildRound(onePhoto, () => 0, new Set([1]))!.answer.id).toBe(1);
  });

  it('needs four different names and one photo', () => {
    expect(buildRound(zoo.slice(0, 3))).toBeNull();
    expect(buildRound(zoo.map((a) => ({ ...a, thumbnailUrl: '  ' })))).toBeNull();
    expect(buildRound([])).toBeNull();
  });

  it('shuffles without losing items', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    expect(shuffle([1, 2, 3, 4], () => 0.999)).toEqual([1, 2, 3, 4]);
  });
});

describe('Quiz', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup(getAll = vi.fn((_lang?: string) => of(zoo))) {
    TestBed.configureTestingModule({
      imports: [Quiz],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll } },
        { provide: QUIZ_RANDOM, useValue: () => 0 },
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
    const choice = (name: string) => choices().find((b) => b.textContent!.includes(name))!;
    const stat = (name: string) =>
      element.querySelector(`[data-stat="${name}"]`)!.textContent!.trim();
    const photo = () => element.querySelector<HTMLImageElement>('.quiz-photo img')!;
    return { fixture, element, refresh, choices, choice, stat, photo, getAll };
  }

  it('shows a blurred photo with four answers', async () => {
    const { element, choices, stat, photo, getAll } = await setup();

    expect(getAll).toHaveBeenCalledWith('en');
    expect(element.querySelector('h2')!.textContent).toBe('Guess the animal');
    expect(photo().getAttribute('src')).toBe('https://example.org/okapi.jpg');
    expect(photo().alt).toBe('Photo of the mystery animal');
    expect(element.querySelector('.quiz-photo')!.classList).toContain('is-blurred');
    expect(choices().map((b) => b.querySelector('.choice-name')!.textContent)).toHaveLength(4);
    expect(choices().map((b) => b.querySelector('.key')!.textContent)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(stat('score')).toBe('0/0');
    expect(stat('streak')).toBe('0');
    expect(element.querySelector('.result')).toBeNull();
  });

  it('reveals the photo and counts a right answer', async () => {
    const { element, choice, choices, stat, photo, refresh } = await setup();

    choice('Okapi').click();
    await refresh();

    expect(element.querySelector('.quiz-photo')!.classList).not.toContain('is-blurred');
    expect(photo().alt).toBe('Okapi');
    expect(element.querySelector('.result')!.textContent).toBe('Correct! It is the Okapi.');
    expect(choice('Okapi').classList).toContain('is-correct');
    expect(choices().every((b) => b.disabled)).toBe(true);
    expect(stat('score')).toBe('1/1');
    expect(stat('streak')).toBe('1');
    expect(stat('best')).toBe('1');
    expect(element.querySelector('a.learn-more')!.getAttribute('href')).toBe('/animals/1');
    expect(document.activeElement).toBe(element.querySelector('button.next'));
  });

  it('marks a wrong answer and resets the streak', async () => {
    const { element, choice, choices, stat, refresh } = await setup();
    choice('Okapi').click();
    await refresh();
    element.querySelector<HTMLButtonElement>('button.next')!.click();
    await refresh();

    const wrong = choices().find((b) => !b.textContent!.includes('Axolotl'))!;
    wrong.click();
    await refresh();

    expect(wrong.classList).toContain('is-wrong');
    expect(choice('Axolotl').classList).toContain('is-correct');
    expect(element.querySelector('.result')!.textContent).toBe('Not quite. It is the Axolotl.');
    expect(stat('score')).toBe('1/2');
    expect(stat('streak')).toBe('0');
    expect(stat('best')).toBe('1');
  });

  it('starts a new blurred round with a different animal', async () => {
    const { element, choice, choices, photo, refresh } = await setup();
    choice('Okapi').click();
    await refresh();

    element.querySelector<HTMLButtonElement>('button.next')!.click();
    await refresh();

    expect(photo().getAttribute('src')).toBe('https://example.org/axolotl.jpg');
    expect(element.querySelector('.quiz-photo')!.classList).toContain('is-blurred');
    expect(choices().some((b) => b.disabled)).toBe(false);
    expect(element.querySelector('.result')).toBeNull();
    expect(document.activeElement).toBe(choices()[0]);
  });

  it('answers with the number keys', async () => {
    const { choices, stat, refresh } = await setup();
    const second = choices()[1];

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    await refresh();

    expect(second.classList.contains('is-correct') || second.classList.contains('is-wrong')).toBe(
      true,
    );
    expect(stat('score')).toMatch(/\/1$/);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    await refresh();
    expect(stat('score')).toMatch(/\/1$/);
  });

  it('skips an animal whose photo does not load', async () => {
    const { photo, refresh } = await setup();

    photo().dispatchEvent(new Event('error'));
    await refresh();

    expect(photo().getAttribute('src')).toBe('https://example.org/axolotl.jpg');
  });

  it('starts over with a clean score', async () => {
    const { element, choice, stat, refresh } = await setup();
    choice('Okapi').click();
    await refresh();
    element.querySelector<HTMLButtonElement>('button.next')!.click();
    await refresh();
    choice('Axolotl').click();
    await refresh();

    element.querySelector<HTMLButtonElement>('button.restart')!.click();
    await refresh();

    expect(stat('score')).toBe('0/0');
    expect(stat('streak')).toBe('0');
    expect(stat('best')).toBe('2');
  });

  it('explains when there are not enough animals', async () => {
    const { element } = await setup(vi.fn(() => of(zoo.slice(0, 3))));

    expect(element.querySelector('.state-message')!.textContent).toContain('at least four animals');
    expect(element.querySelector('button.choice')).toBeNull();
  });

  it('shows an error when the API is down', async () => {
    const { element } = await setup(vi.fn(() => throwError(() => new Error('down'))));

    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'Could not load the quiz',
    );
  });

  it('reloads in German and keeps the current round', async () => {
    const german = zoo.map((a) => ({ ...a, commonName: `${a.commonName} DE` }));
    const getAll = vi.fn((lang?: string) => of(lang === 'de' ? german : zoo));
    const { element, choices, photo, refresh } = await setup(getAll);

    TestBed.inject(LanguageService).setLanguage('de');
    await refresh();

    expect(getAll).toHaveBeenCalledWith('de');
    expect(photo().getAttribute('src')).toBe('https://example.org/okapi.jpg');
    expect(choices().every((b) => b.textContent!.includes(' DE'))).toBe(true);
    expect(element.querySelector('h2')!.textContent).toBe('Errate das Tier');
    expect(element.querySelector('.quiz-prompt')!.textContent).toBe(
      'Welches Tier ist auf dem Foto?',
    );
  });

  it('uses French labels', async () => {
    localStorage.setItem('language', 'fr');
    const { element, choice, refresh } = await setup();

    expect(element.querySelector('h2')!.textContent).toBe('Devinez l’animal');
    choice('Okapi').click();
    await refresh();
    expect(element.querySelector('button.next')!.textContent!.trim()).toBe('Animal suivant');
  });
});
