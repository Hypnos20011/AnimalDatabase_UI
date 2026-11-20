import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Animal } from '../animal-model/animal.model';
import { AnimalService } from '../shared/animal.service';
import { LanguageService } from '../shared/i18n/language.service';
import { QUIZ_FACT_LIST, QuizFact } from './quiz-facts';
import {
  buildDailyPlan,
  buildFactRound,
  matchFactAnimal,
  orderFactCycle,
  matchesFilter,
  mulberry32,
  Quiz,
  QUIZ_BEST_STORAGE,
  QUIZ_DAILY_ROUNDS,
  QUIZ_DAILY_STORAGE,
  QUIZ_FACTS,
  QUIZ_MISSED_STORAGE,
  QUIZ_RANDOM,
  quizDateKey,
  readBestStreak,
  readDailyBest,
  readMissedIds,
  seedFromDate,
  shuffle,
} from './quiz';

function testFact(commonName: string): QuizFact {
  return {
    scientificName: `Species ${commonName}`,
    commonName,
    question: {
      en: `Which fact matches ${commonName}?`,
      de: `Welcher Fakt passt zu ${commonName}?`,
      fr: `Quel fait correspond à ${commonName} ?`,
    },
    fact: {
      en: `${commonName} fact.`,
      de: `${commonName} Fakt.`,
      fr: `${commonName} fait.`,
    },
  };
}

const testFacts = ['Okapi', 'Axolotl', 'Aye-aye', 'Shoebill', 'Tapir', 'Lion', 'Wolf', 'Kiwi'].map(
  testFact,
);

function animal(id: number, commonName: string, thumbnailUrl: string | null = null): Animal {
  return { id, commonName, thumbnailUrl } as Animal;
}

function classed(
  id: number,
  commonName: string,
  taxonomicClass: string,
  habitatType: string,
  thumbnailUrl: string | null = null,
): Animal {
  return { ...animal(id, commonName, thumbnailUrl), taxonomicClass, habitatType };
}

const wild = [
  classed(1, 'Okapi', 'mammal', 'forest', 'https://example.org/okapi.jpg'),
  classed(2, 'Axolotl', 'amphibian', 'freshwater', 'https://example.org/axolotl.jpg'),
  classed(3, 'Aye-aye', 'mammal', 'forest'),
  classed(4, 'Shoebill', 'bird', 'wetland', 'https://example.org/shoebill.jpg'),
  classed(5, 'Tapir', 'mammal', 'forest'),
  classed(6, 'Lion', 'mammal', 'grassland', 'https://example.org/lion.jpg'),
  classed(7, 'Wolf', 'mammal', 'forest'),
];

const zoo = [
  animal(1, 'Okapi', 'https://example.org/okapi.jpg'),
  animal(2, 'Axolotl', 'https://example.org/axolotl.jpg'),
  animal(3, 'Aye-aye'),
  animal(4, 'Shoebill'),
  animal(5, 'Tapir'),
];

const photos = [
  animal(1, 'Okapi', 'https://example.org/okapi.jpg'),
  animal(2, 'Axolotl', 'https://example.org/axolotl.jpg'),
  animal(3, 'Aye-aye', 'https://example.org/aye.jpg'),
  animal(4, 'Shoebill', 'https://example.org/shoebill.jpg'),
  animal(5, 'Tapir', 'https://example.org/tapir.jpg'),
  animal(6, 'Lion', 'https://example.org/lion.jpg'),
];

const liveCatalog = [
  'Ambystoma mexicanum',
  'Daubentonia madagascariensis',
  'Mungos mungo',
  'Otocyon megalotis',
  'Arctictis binturong',
  'Psychrolutes marcidus',
  'Neofelis nebulosa',
  'Grimpoteuthis',
  'Casuarius bennetti',
  'Conger conger',
  'Enchelycore anatina',
  'Vulpes zerda',
  'Hyalinobatrachium fleischmanni',
  'Gavialis gangeticus',
  'Archispirostreptus gigas',
  'Myrmecophaga tridactyla',
  'Narcine entemedor',
  'Acerodon jubatus',
  'Heteropoda maxima',
  'Phyllobates terribilis',
  'Hapalochlaena lunulata',
  'Madoqua guentheri',
  'Harpia harpyja',
  'Dosidicus gigas',
  'Ratufa indica',
  'Manis crassicaudata',
  'Hottentotta tamulus',
  'Macrocheira kaempferi',
  'Phycodurus eques',
  'Pardofelis marmorata',
  'Chelus fimbriata',
  'Heterocephalus glaber',
  'Pachydactylus rangei',
  'Sciurillus pusillus',
  'Aulacorhynchus prasinus',
  'Tamandua mexicana',
  'Okapia johnstoni',
  'Solenostomus paradoxus',
  'Chrysopelea paradisi',
  'Scolopendra gigantea',
  'Chlamyphorus truncatus',
  'Ornithorhynchus anatinus',
  'Sphinx ligustri',
  'Petaurista alborufus',
  'Solenostomus cyanopterus',
  'Balaeniceps rex',
  'Tachyglossus aculeatus',
  'Cyclopes',
  'Casuarius casuarius',
  'Tamandua tetradactyla',
  'Condylura cristata',
  'Galeopterus variegatus',
  'Nycticebus coucang',
  'Sarcophilus harrisii',
  'Cassiopea',
  'Nasua narica',
  'Heteroconger luteolus',
  'Inia geoffrensis',
  'Monodon monoceros',
  'Strigops habroptilus',
  'Apteryx',
  'Cryptoprocta ferox',
  'Saiga tatarica',
  'Nasalis larvatus',
  'Opisthocomus hoazin',
  'Synodontis nigriventris',
  'Varanus komodoensis',
];

describe('curated facts', () => {
  it('has a reviewed fact in English, German, and French for each question', () => {
    expect(QUIZ_FACT_LIST.length).toBeGreaterThanOrEqual(15);
    const names = new Set<string>();
    for (const fact of QUIZ_FACT_LIST) {
      expect(names.has(fact.scientificName)).toBe(false);
      names.add(fact.scientificName);
      for (const language of ['en', 'de', 'fr'] as const) {
        expect(fact.question[language].trim().length).toBeGreaterThan(10);
        expect(fact.fact[language].trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('links at least 30 facts to the known live catalog', () => {
    const animals = liveCatalog.map(
      (scientificName, index) =>
        ({
          id: index + 1,
          commonName: `Animal ${index}`,
          scientificName,
          thumbnailUrl: 'x',
        }) as Animal,
    );
    const matched = QUIZ_FACT_LIST.filter((fact) => matchFactAnimal(fact, animals));
    expect(matched.length).toBe(QUIZ_FACT_LIST.length);
    expect(matched.length).toBeGreaterThanOrEqual(44);
    const dolphin = QUIZ_FACT_LIST.find((fact) => fact.scientificName === 'Inia geoffrensis')!;
    expect(matchFactAnimal(dolphin, animals)?.scientificName).toBe('Inia geoffrensis');
    const komodo = QUIZ_FACT_LIST.find((fact) => fact.scientificName === 'Varanus komodoensis')!;
    expect(matchFactAnimal(komodo, animals)?.scientificName).toBe('Varanus komodoensis');
    expect(komodo.commonName).toBe('Komodo dragon');
  });
});

describe('buildFactRound', () => {
  const ids = (animals: Animal[]) => animals.map((a) => a.id).sort();

  it('picks a matching fact and three other names, with or without a photo', () => {
    const round = buildFactRound(testFacts, zoo, () => 0)!;

    expect(round.answer.commonName).toBe('Okapi');
    expect(round.fact.commonName).toBe('Okapi');
    expect(round.choices).toHaveLength(4);
    expect(round.choices).toContain(round.answer);
    expect(new Set(round.choices.map((a) => a.commonName)).size).toBe(4);
    expect(
      buildFactRound(
        testFacts,
        zoo.map((a) => ({ ...a, thumbnailUrl: null })),
        () => 0,
      ),
    ).not.toBeNull();
  });

  it('matches a scientific name before the common name', () => {
    const latin = {
      ...zoo[0],
      commonName: 'Okapi DE',
      scientificName: 'Okapia johnstoni',
    } as Animal;
    const fact = {
      ...testFacts[0],
      scientificName: 'Okapia johnstoni',
      commonName: 'Okapi',
    };
    expect(matchFactAnimal(fact, [latin])?.id).toBe(latin.id);
    expect(
      matchFactAnimal(testFacts[0], [{ ...zoo[0], commonName: 'Something else' } as Animal]),
    ).toBeNull();
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
      expect(ids(buildFactRound(testFacts, twins, () => r)!.choices)).not.toContain(2);
    }
  });

  it('avoids the last answer when it can', () => {
    expect(buildFactRound(testFacts, zoo, () => 0, new Set([1]))!.answer.id).toBe(2);
  });

  it('needs four different names and a matching fact', () => {
    expect(buildFactRound(testFacts, zoo.slice(0, 3))).toBeNull();
    expect(buildFactRound([], zoo)).toBeNull();
    expect(buildFactRound(testFacts, [])).toBeNull();
  });

  it('shuffles without losing items', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    expect(shuffle([1, 2, 3, 4], () => 0.999)).toEqual([1, 2, 3, 4]);
  });
});

describe('orderFactCycle', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, index) => ({ id: index + 1 }));

  it('uses every fact once before the order repeats', () => {
    const order = orderFactCycle(ids(5), () => 0.4);
    expect(order.map((item) => item.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not start a new cycle with the fact just shown', () => {
    const identity = orderFactCycle(ids(4), () => 0.999, 1).map((item) => item.id);
    expect(identity).toEqual([2, 3, 4, 1]);
    const rotated = orderFactCycle(ids(4), () => 0, 2).map((item) => item.id);
    expect(rotated[0]).not.toBe(2);
    expect([...rotated].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it('keeps a one-fact pool playable', () => {
    expect(orderFactCycle([{ id: 7 }], () => 0, 7)).toEqual([{ id: 7 }]);
    expect(orderFactCycle([], () => 0)).toEqual([]);
  });
});

describe('quiz helpers', () => {
  afterEach(() => localStorage.clear());

  it('matches animals by class and habitat', () => {
    const okapi = wild[0];
    expect(matchesFilter(okapi, { taxonomicClass: '', habitatType: '' })).toBe(true);
    expect(matchesFilter(okapi, { taxonomicClass: 'mammal', habitatType: '' })).toBe(true);
    expect(matchesFilter(okapi, { taxonomicClass: 'mammal', habitatType: 'forest' })).toBe(true);
    expect(matchesFilter(okapi, { taxonomicClass: 'bird', habitatType: '' })).toBe(false);
    expect(matchesFilter(okapi, { taxonomicClass: '', habitatType: 'ocean' })).toBe(false);
  });

  it('reads only a positive whole best streak', () => {
    expect(readBestStreak()).toBe(0);
    localStorage.setItem(QUIZ_BEST_STORAGE, '5');
    expect(readBestStreak()).toBe(5);
    for (const bad of ['abc', '-2', '1.5', '']) {
      localStorage.setItem(QUIZ_BEST_STORAGE, bad);
      expect(readBestStreak()).toBe(0);
    }
  });

  it('reads missed animal ids from storage', () => {
    expect(readMissedIds()).toEqual([]);
    localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([3, 1, 3, 0, -2, 'x', 1.5, 2]));
    expect(readMissedIds()).toEqual([3, 1, 2]);
    localStorage.setItem(QUIZ_MISSED_STORAGE, '{');
    expect(readMissedIds()).toEqual([]);
    localStorage.setItem(QUIZ_MISSED_STORAGE, '"nope"');
    expect(readMissedIds()).toEqual([]);
  });
});

describe('daily challenge helpers', () => {
  afterEach(() => localStorage.clear());

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

  it('builds the same plan for the same date and a different plan for another day', () => {
    const a = buildDailyPlan(testFacts, many, '2026-11-05')!;
    const b = buildDailyPlan(testFacts, many, '2026-11-05')!;
    const c = buildDailyPlan(testFacts, many, '2026-11-06')!;

    expect(a).toHaveLength(QUIZ_DAILY_ROUNDS);
    expect(a.map((round) => round.answer.id)).toEqual(b.map((round) => round.answer.id));
    expect(a.map((round) => round.choices.map((choice) => choice.id))).toEqual(
      b.map((round) => round.choices.map((choice) => choice.id)),
    );
    expect(a.map((round) => round.answer.id)).not.toEqual(c.map((round) => round.answer.id));
  });

  it('needs enough matching facts for the daily length', () => {
    expect(buildDailyPlan(testFacts, many.slice(0, 4), '2026-11-05')).toBeNull();
  });

  it('seeds deterministically from the date key', () => {
    expect(seedFromDate('2026-11-05')).toBe(seedFromDate('2026-11-05'));
    expect(seedFromDate('2026-11-05')).not.toBe(seedFromDate('2026-11-06'));
    expect(mulberry32(1)()).toBe(mulberry32(1)());
  });

  it('formats Vienna calendar dates as YYYY-MM-DD', () => {
    expect(quizDateKey(new Date('2026-11-05T10:00:00+01:00'))).toBe('2026-11-05');
    expect(quizDateKey(new Date('2026-11-05T23:30:00+01:00'))).toBe('2026-11-05');
  });

  it("reads only today's daily best", () => {
    const today = quizDateKey();
    expect(readDailyBest(today)).toBeNull();
    localStorage.setItem(QUIZ_DAILY_STORAGE, JSON.stringify({ date: today, score: 4, streak: 3 }));
    expect(readDailyBest(today)).toEqual({ date: today, score: 4, streak: 3 });
    localStorage.setItem(
      QUIZ_DAILY_STORAGE,
      JSON.stringify({ date: '1999-01-01', score: 5, streak: 5 }),
    );
    expect(readDailyBest(today)).toBeNull();
  });
});
describe('Quiz', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    TestBed.inject(LanguageService).setLanguage('en');
  });

  async function setup(getAll = vi.fn((_lang?: string) => of(zoo))) {
    TestBed.configureTestingModule({
      imports: [Quiz],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll } },
        { provide: QUIZ_RANDOM, useValue: () => 0 },
        { provide: QUIZ_FACTS, useValue: testFacts },
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
    const practice = () => element.querySelector<HTMLButtonElement>('button.practice-missed');
    const prompt = () => element.querySelector('.quiz-prompt')!.textContent!.trim();
    const answerName = () => {
      const matched = prompt().match(/(?:matches|zu|à) (.+?)\s*\?$/);
      if (!matched) throw new Error(prompt());
      return matched[1];
    };
    return {
      fixture,
      element,
      refresh,
      choices,
      choice,
      stat,
      photo,
      practice,
      getAll,
      prompt,
      answerName,
    };
  }

  it('shows a clear photo, a fact, and four answers', async () => {
    const { element, choices, stat, photo, getAll } = await setup();

    expect(getAll).toHaveBeenCalledWith('en');
    expect(element.querySelector('h2')!.textContent).toBe('Fact quiz');
    expect(element.querySelector('.quiz-prompt')!.textContent).toBe('Which fact matches Axolotl?');
    expect(element.querySelector('button.show-solution')!.textContent!.trim()).toBe(
      'Show solution',
    );
    expect(photo().getAttribute('src')).toBe('https://example.org/axolotl.jpg');
    expect(photo().alt).toBe('Photo shown with this question');
    expect(element.querySelector('.quiz-photo')!.classList.contains('is-blurred')).toBe(false);
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
    const { element, choice, choices, stat, photo, refresh, answerName } = await setup();

    choice(answerName()).click();
    await refresh();

    expect(element.querySelector('.quiz-photo')!.classList.contains('is-blurred')).toBe(false);
    expect(photo().alt).toBe('Axolotl');
    expect(element.querySelector('.fun-fact')!.textContent).toContain('Axolotl fact.');
    expect(element.querySelector('button.show-solution')).toBeNull();
    expect(element.querySelector('.result')!.textContent!.trim()).toBe(
      'Correct! It is the Axolotl.',
    );
    expect(choice('Axolotl').classList).toContain('is-correct');
    expect(choices().every((b) => b.disabled)).toBe(true);
    expect(stat('score')).toBe('1/1');
    expect(stat('streak')).toBe('1');
    expect(stat('best')).toBe('1');
    expect(element.querySelector('a.learn-more')!.getAttribute('href')).toBe('/animals/2');
    expect(document.activeElement).toBe(element.querySelector('button.next'));
  });

  it('marks a wrong answer and resets the streak', async () => {
    const { element, choice, choices, stat, refresh, answerName } = await setup();
    choice(answerName()).click();
    await refresh();
    element.querySelector<HTMLButtonElement>('button.next')!.click();
    await refresh();

    const wrong = choices().find((b) => !b.textContent!.includes(answerName()))!;
    wrong.click();
    await refresh();

    expect(wrong.classList).toContain('is-wrong');
    expect(choice('Aye-aye').classList).toContain('is-correct');
    expect(element.querySelector('.result')!.textContent!.trim()).toBe(
      'Not quite. It is the Aye-aye.',
    );
    expect(stat('score')).toBe('1/2');
    expect(stat('streak')).toBe('0');
    expect(stat('best')).toBe('1');
  });

  it('starts a new blurred round with a different animal', async () => {
    const { element, choice, choices, refresh, answerName } = await setup();
    choice(answerName()).click();
    await refresh();

    element.querySelector<HTMLButtonElement>('button.next')!.click();
    await refresh();

    expect(element.querySelector('.quiz-photo')).toBeNull();
    expect(element.querySelector('.quiz-prompt')!.textContent).toBe('Which fact matches Aye-aye?');
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

  it('keeps the fact when the photo does not load', async () => {
    const { element, photo, refresh } = await setup();

    photo().dispatchEvent(new Event('error'));
    await refresh();

    expect(element.querySelector('.quiz-photo')).toBeNull();
    expect(element.querySelector('.quiz-prompt')!.textContent).toBe('Which fact matches Axolotl?');
    expect(element.querySelectorAll('button.choice')).toHaveLength(4);
  });

  it('shows the answer and fun fact without scoring when the solution is revealed', async () => {
    const { element, stat, refresh } = await setup();

    element.querySelector<HTMLButtonElement>('button.show-solution')!.click();
    await refresh();

    expect(element.querySelector('.result')!.textContent!.trim()).toBe('It is the Axolotl.');
    expect(element.querySelector('.fun-fact')!.textContent).toContain('Axolotl fact.');
    expect(stat('score')).toBe('0/1');
    expect(stat('streak')).toBe('0');
    expect(element.querySelector('button.choice.is-correct')!.textContent).toContain('Axolotl');
  });

  it('starts over with a clean score', async () => {
    const { element, choice, stat, refresh, answerName } = await setup();
    choice(answerName()).click();
    await refresh();
    element.querySelector<HTMLButtonElement>('button.next')!.click();
    await refresh();
    choice(answerName()).click();
    await refresh();

    element.querySelector<HTMLButtonElement>('button.restart')!.click();
    await refresh();

    expect(stat('score')).toBe('0/0');
    expect(stat('streak')).toBe('0');
    expect(stat('best')).toBe('2');
  });

  it('explains when there are not enough animals', async () => {
    const { element } = await setup(vi.fn(() => of(zoo.slice(0, 3))));

    expect(element.querySelector('.state-message')!.textContent).toContain(
      'at least four animals and a fact',
    );
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
    expect(photo().getAttribute('src')).toBe('https://example.org/axolotl.jpg');
    expect(choices().every((b) => b.textContent!.includes(' DE'))).toBe(true);
    expect(element.querySelector('h2')!.textContent).toBe('Faktenquiz');
    expect(element.querySelector('.quiz-prompt')!.textContent).toBe(
      'Welcher Fakt passt zu Axolotl?',
    );
  });

  it('uses French labels', async () => {
    localStorage.setItem('language', 'fr');
    const { element, choice, refresh, answerName } = await setup();

    expect(element.querySelector('h2')!.textContent).toBe('Quiz des faits');
    choice(answerName()).click();
    await refresh();
    expect(element.querySelector('button.next')!.textContent!.trim()).toBe('Animal suivant');
  });

  describe('best streak', () => {
    it('restores the saved best streak', async () => {
      localStorage.setItem(QUIZ_BEST_STORAGE, '7');
      const { choice, stat, refresh, answerName } = await setup();

      expect(stat('best')).toBe('7');
      choice(answerName()).click();
      await refresh();

      expect(stat('streak')).toBe('1');
      expect(stat('best')).toBe('7');
      expect(localStorage.getItem(QUIZ_BEST_STORAGE)).toBe('7');
    });

    it('saves a new best streak and keeps it after a restart', async () => {
      localStorage.setItem(QUIZ_BEST_STORAGE, '1');
      const { element, choice, stat, refresh, answerName } = await setup();
      choice(answerName()).click();
      await refresh();
      expect(localStorage.getItem(QUIZ_BEST_STORAGE)).toBe('1');

      element.querySelector<HTMLButtonElement>('button.next')!.click();
      await refresh();
      choice(answerName()).click();
      await refresh();

      expect(stat('best')).toBe('2');
      expect(localStorage.getItem(QUIZ_BEST_STORAGE)).toBe('2');

      element.querySelector<HTMLButtonElement>('button.restart')!.click();
      await refresh();
      expect(stat('best')).toBe('2');
    });

    it('starts at zero when nothing is saved', async () => {
      const { choices, stat, refresh } = await setup();
      expect(stat('best')).toBe('0');

      choices()
        .find((b) => !b.textContent!.includes('Okapi'))!
        .click();
      await refresh();

      expect(stat('best')).toBe('0');
      expect(localStorage.getItem(QUIZ_BEST_STORAGE)).toBeNull();
    });
  });

  describe('missed animals', () => {
    it('saves a missed id on a wrong answer and shows the practice control', async () => {
      const { choices, practice, refresh, answerName } = await setup(vi.fn(() => of(photos)));
      expect(practice()).toBeNull();

      choices()
        .find((b) => !b.textContent!.includes(answerName()))!
        .click();
      await refresh();

      expect(JSON.parse(localStorage.getItem(QUIZ_MISSED_STORAGE)!)).toEqual([2]);
      expect(practice()!.textContent!.trim()).toBe('Practice missed (1)');
      expect(practice()!.getAttribute('aria-pressed')).toBe('false');
    });

    it('does not duplicate a missed id on another wrong answer', async () => {
      const { element, choice, choices, refresh, answerName } = await setup(
        vi.fn(() => of(photos)),
      );
      const wrong = () => choices().find((b) => !b.textContent!.includes(answerName()))!;
      wrong().click();
      await refresh();
      const missed = JSON.parse(localStorage.getItem(QUIZ_MISSED_STORAGE)!) as number[];
      element.querySelector<HTMLButtonElement>('button.next')!.click();
      await refresh();
      choice(answerName()).click();
      await refresh();
      element.querySelector<HTMLButtonElement>('button.next')!.click();
      await refresh();
      wrong().click();
      await refresh();

      const ids = JSON.parse(localStorage.getItem(QUIZ_MISSED_STORAGE)!) as number[];
      expect(ids[0]).toBe(missed[0]);
      expect(ids.filter((id) => id === missed[0])).toHaveLength(1);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('removes a missed id after one correct answer', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([1, 2]));
      const { choice, practice, refresh, answerName } = await setup(vi.fn(() => of(photos)));

      expect(practice()!.textContent!.trim()).toBe('Practice missed (2)');
      choice(answerName()).click();
      await refresh();

      expect(JSON.parse(localStorage.getItem(QUIZ_MISSED_STORAGE)!)).toEqual([1]);
      expect(practice()!.textContent!.trim()).toBe('Practice missed (1)');
    });

    it('restores missed ids from localStorage', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([4, 6]));
      const { practice } = await setup(vi.fn(() => of(photos)));
      expect(practice()!.textContent!.trim()).toBe('Practice missed (2)');
    });

    it('narrows the pool to missed animals in practice mode', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([1, 2, 3, 4]));
      const { choices, practice, photo, refresh, stat } = await setup(vi.fn(() => of(photos)));
      practice()!.click();
      await refresh();

      expect(practice()!.classList).toContain('is-active');
      expect(practice()!.getAttribute('aria-pressed')).toBe('true');
      expect(photo().getAttribute('src')).toBe('https://example.org/aye.jpg');
      expect(
        choices()
          .map((b) => b.querySelector('.choice-name')!.textContent)
          .sort(),
      ).toEqual(['Axolotl', 'Aye-aye', 'Okapi', 'Shoebill']);
      expect(stat('score')).toBe('0/0');
    });

    it('keeps the streak when entering practice mode', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([1, 2, 3, 4]));
      const { choice, practice, refresh, stat, answerName } = await setup(vi.fn(() => of(photos)));
      choice(answerName()).click();
      await refresh();
      expect(stat('streak')).toBe('1');

      practice()!.click();
      await refresh();

      expect(stat('streak')).toBe('1');
      expect(stat('score')).toBe('1/1');
    });

    it('shows an empty state when practice has too few animals', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([1, 2]));
      const { element, choices, practice, refresh } = await setup(vi.fn(() => of(photos)));
      practice()!.click();
      await refresh();

      expect(choices()).toHaveLength(0);
      expect(element.querySelector('.quiz-photo')).toBeNull();
      expect(element.querySelector('.state-message')!.textContent).toContain(
        'Not enough missed animals to practice',
      );

      element.querySelector<HTMLButtonElement>('button.exit-practice')!.click();
      await refresh();

      expect(choices()).toHaveLength(4);
      expect(practice()!.classList).not.toContain('is-active');
    });

    it('clears the last missed id and hides the practice control', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([2]));
      const { choice, practice, refresh, answerName } = await setup(vi.fn(() => of(photos)));
      expect(practice()!.textContent!.trim()).toBe('Practice missed (1)');
      choice(answerName()).click();
      await refresh();

      expect(localStorage.getItem(QUIZ_MISSED_STORAGE)).toBeNull();
      expect(practice()).toBeNull();
    });

    it('keeps practice mode across a language switch', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([1, 2, 3, 4]));
      const german = photos.map((a) => ({ ...a, commonName: `${a.commonName} DE` }));
      const getAll = vi.fn((lang?: string) => of(lang === 'de' ? german : photos));
      const { practice, photo, choices, refresh } = await setup(getAll);
      practice()!.click();
      await refresh();

      TestBed.inject(LanguageService).setLanguage('de');
      await refresh();

      expect(practice()!.classList).toContain('is-active');
      expect(practice()!.textContent!.trim()).toBe('Fehler üben (4)');
      expect(photo().getAttribute('src')).toBe('https://example.org/aye.jpg');
      expect(choices().every((b) => b.textContent!.includes(' DE'))).toBe(true);
    });

    it('labels practice mode in French', async () => {
      localStorage.setItem('language', 'fr');
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([1, 2]));
      const { practice } = await setup(vi.fn(() => of(photos)));
      expect(practice()!.textContent!.trim()).toBe('Réviser les ratés (2)');
    });

    it('combines practice mode with class filters', async () => {
      localStorage.setItem(QUIZ_MISSED_STORAGE, JSON.stringify([1, 3, 5, 6, 7]));
      const { element, choices, practice, refresh } = await setup(vi.fn(() => of(wild)));
      practice()!.click();
      await refresh();

      const classSelect = element.querySelector<HTMLSelectElement>('select.filter-class')!;
      classSelect.value = 'mammal';
      classSelect.dispatchEvent(new Event('change'));
      await refresh();

      const names = choices().map((b) => b.querySelector('.choice-name')!.textContent);
      expect(names).toHaveLength(4);
      for (const name of names) {
        expect(['Aye-aye', 'Lion', 'Okapi', 'Tapir', 'Wolf']).toContain(name);
      }
    });
  });

  describe('daily challenge', () => {
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

    const dailyBtn = (element: HTMLElement) =>
      element.querySelector<HTMLButtonElement>('button.daily-challenge')!;

    it('enters daily mode with a seeded progress label and hides filters', async () => {
      const catalog = [
        classed(1, 'Okapi', 'mammal', 'forest', 'https://example.org/okapi.jpg'),
        classed(2, 'Axolotl', 'amphibian', 'freshwater', 'https://example.org/axolotl.jpg'),
        classed(3, 'Aye-aye', 'mammal', 'forest', 'https://example.org/aye.jpg'),
        classed(4, 'Shoebill', 'bird', 'wetland', 'https://example.org/shoebill.jpg'),
        classed(5, 'Tapir', 'mammal', 'forest', 'https://example.org/tapir.jpg'),
        classed(6, 'Lion', 'mammal', 'grassland', 'https://example.org/lion.jpg'),
        classed(7, 'Wolf', 'mammal', 'forest', 'https://example.org/wolf.jpg'),
        classed(8, 'Kiwi', 'bird', 'forest', 'https://example.org/kiwi.jpg'),
      ];
      const { element, choices, refresh } = await setup(vi.fn(() => of(catalog)));
      expect(dailyBtn(element).textContent!.trim()).toBe('Daily challenge');
      expect(element.querySelector('select.filter-class')).not.toBeNull();

      dailyBtn(element).click();
      await refresh();

      expect(dailyBtn(element).classList).toContain('is-active');
      expect(element.querySelector('[data-daily="progress"]')!.textContent).toContain(
        'Question 1 of 5',
      );
      expect(element.querySelector('select.filter-class')).toBeNull();
      expect(element.querySelector('button.practice-missed')).toBeNull();
      expect(choices()).toHaveLength(4);
      expect(element.querySelector('.quiz-photo')).not.toBeNull();
    });

    it('plays the same answer order for the same day', async () => {
      const plan = buildDailyPlan(testFacts, many, quizDateKey())!;
      const { choice, element, refresh, photo } = await setup(vi.fn(() => of(many)));
      dailyBtn(element).click();
      await refresh();

      expect(photo().getAttribute('src')).toBe(plan[0].answer.thumbnailUrl);

      choice(plan[0].answer.commonName).click();
      await refresh();
      element.querySelector<HTMLButtonElement>('button.next')!.click();
      await refresh();

      expect(photo().getAttribute('src')).toBe(plan[1].answer.thumbnailUrl);
      expect(element.querySelector('[data-daily="progress"]')!.textContent).toContain(
        'Question 2 of 5',
      );
    });

    it("saves and restores today's best after finishing", async () => {
      const plan = buildDailyPlan(testFacts, many, quizDateKey())!;
      const { choice, element, refresh, stat } = await setup(vi.fn(() => of(many)));
      dailyBtn(element).click();
      await refresh();

      for (let i = 0; i < plan.length; i++) {
        choice(plan[i].answer.commonName).click();
        await refresh();
        element.querySelector<HTMLButtonElement>('button.next')!.click();
        await refresh();
      }

      expect(element.querySelector('[data-daily="done"]')!.textContent).toContain('5/5');
      expect(stat('score')).toBe('5/5');
      const saved = JSON.parse(localStorage.getItem(QUIZ_DAILY_STORAGE)!);
      expect(saved).toEqual({ date: quizDateKey(), score: 5, streak: 5 });
      expect(element.querySelector('[data-daily="best"]')!.textContent).toContain(
        "Today's best: 5/5",
      );

      element.querySelector<HTMLButtonElement>('button.daily-exit')!.click();
      await refresh();
      expect(dailyBtn(element).classList).not.toContain('is-active');
      expect(element.querySelector('button.choice')).not.toBeNull();
    });

    it('shows an empty state when daily cannot be built', async () => {
      const { element, refresh } = await setup(vi.fn(() => of(many.slice(0, 3))));
      dailyBtn(element).click();
      await refresh();

      expect(element.querySelector('.state-message')!.textContent).toContain(
        'Not enough matching facts',
      );
      element.querySelector<HTMLButtonElement>('button.daily-exit')!.click();
      await refresh();
      expect(dailyBtn(element).classList).not.toContain('is-active');
    });

    it('labels daily mode in German and French', async () => {
      localStorage.setItem('language', 'de');
      const de = await setup(vi.fn(() => of(many)));
      expect(dailyBtn(de.element).textContent!.trim()).toBe('Tägliche Herausforderung');

      TestBed.inject(LanguageService).setLanguage('fr');
      await de.refresh();
      expect(dailyBtn(de.element).textContent!.trim()).toBe('Défi du jour');
    });

    it('keeps daily mode across a language switch', async () => {
      const german = many.map((a) => ({ ...a, commonName: `${a.commonName} DE` }));
      const getAll = vi.fn((lang?: string) => of(lang === 'de' ? german : many));
      const plan = buildDailyPlan(testFacts, many, quizDateKey())!;
      const { element, photo, refresh } = await setup(getAll);
      dailyBtn(element).click();
      await refresh();

      TestBed.inject(LanguageService).setLanguage('de');
      await refresh();

      expect(dailyBtn(element).classList).toContain('is-active');
      expect(photo().getAttribute('src')).toBe(plan[0].answer.thumbnailUrl);
      expect(element.querySelector('[data-daily="progress"]')!.textContent).toContain(
        'Frage 1 von 5',
      );
    });
  });
  describe('filters', () => {
    const select = (element: HTMLElement, name: 'class' | 'habitat') =>
      element.querySelector<HTMLSelectElement>(`select.filter-${name}`)!;
    const options = (el: HTMLSelectElement) =>
      Array.from(el.options).map((o) => o.textContent!.trim());
    const change = async (el: HTMLSelectElement, value: string, refresh: () => Promise<void>) => {
      el.value = value;
      el.dispatchEvent(new Event('change'));
      await refresh();
    };

    it('lists classes and habitats with translated labels', async () => {
      const { element } = await setup(vi.fn(() => of(wild)));

      expect(options(select(element, 'class'))).toEqual(['All', 'Amphibian', 'Bird', 'Mammal']);
      expect(options(select(element, 'habitat'))).toEqual([
        'All',
        'Forest',
        'Freshwater',
        'Grassland',
        'Wetland',
      ]);
      expect(select(element, 'class').value).toBe('');
    });

    it('uses German and French labels', async () => {
      localStorage.setItem('language', 'de');
      const de = await setup(vi.fn(() => of(wild)));
      expect(options(select(de.element, 'class'))).toEqual([
        'Alle',
        'Amphibie',
        'S\u00e4ugetier',
        'Vogel',
      ]);
      expect(de.element.querySelector('.quiz-filters')!.textContent).toContain('Lebensraum');

      TestBed.inject(LanguageService).setLanguage('fr');
      await de.refresh();
      expect(options(select(de.element, 'class'))).toEqual([
        'Tous',
        'Amphibien',
        'Mammif\u00e8re',
        'Oiseau',
      ]);
    });

    it('only asks about animals of the chosen class and habitat', async () => {
      const { element, choices, refresh } = await setup(vi.fn(() => of(wild)));
      const names = () => choices().map((b) => b.querySelector('.choice-name')!.textContent);

      await change(select(element, 'class'), 'mammal', refresh);
      expect(choices()).toHaveLength(4);
      for (const name of names()) {
        expect(['Okapi', 'Aye-aye', 'Tapir', 'Lion', 'Wolf']).toContain(name);
      }

      await change(select(element, 'habitat'), 'forest', refresh);
      expect([...names()].sort()).toEqual(['Aye-aye', 'Okapi', 'Tapir', 'Wolf']);
      expect(select(element, 'class').value).toBe('mammal');
      expect(select(element, 'habitat').value).toBe('forest');
    });

    it('explains when a filter has too few animals and can reset it', async () => {
      const { element, choices, refresh } = await setup(vi.fn(() => of(wild)));

      await change(select(element, 'class'), 'bird', refresh);

      expect(choices()).toHaveLength(0);
      expect(element.querySelector('.quiz-photo')).toBeNull();
      expect(element.querySelector('.state-message')!.textContent).toContain(
        'Not enough animals for this filter',
      );

      element.querySelector<HTMLButtonElement>('button.reset-filters')!.click();
      await refresh();

      expect(choices()).toHaveLength(4);
      expect(select(element, 'class').value).toBe('');
      expect(element.querySelector('button.reset-filters')).toBeNull();
    });

    it('walks the matching facts once, then starts a new cycle on a different fact', async () => {
      const { element, choice, refresh } = await setup();
      const prompt = () => element.querySelector('.quiz-prompt')!.textContent!;
      const seen: string[] = [];
      for (let i = 0; i < zoo.length; i++) {
        const text = prompt();
        seen.push(text);
        const name = text.slice('Which fact matches '.length, -1);
        choice(name).click();
        await refresh();
        element.querySelector<HTMLButtonElement>('button.next')!.click();
        await refresh();
      }
      expect(new Set(seen).size).toBe(zoo.length);
      expect(prompt()).not.toBe(seen[seen.length - 1]);
      expect(seen).toContain(prompt());
    });

    it('rebuilds the cycle for a filtered pool', async () => {
      const { element, refresh } = await setup(vi.fn(() => of(wild)));
      const select = element.querySelector<HTMLSelectElement>('select.filter-class')!;
      select.value = 'mammal';
      select.dispatchEvent(new Event('change'));
      await refresh();

      const text = element.querySelector('.quiz-prompt')!.textContent!;
      expect(text).not.toContain('Axolotl');
      expect(text).not.toContain('Shoebill');
      expect(
        ['Okapi', 'Aye-aye', 'Tapir', 'Lion', 'Wolf'].some((name) => text.includes(name)),
      ).toBe(true);
    });

    it('keeps the streak when the filter changes', async () => {
      const { element, choice, stat, refresh, answerName } = await setup(vi.fn(() => of(wild)));
      choice(answerName()).click();
      await refresh();

      await change(select(element, 'class'), 'mammal', refresh);

      expect(stat('streak')).toBe('1');
      expect(stat('score')).toBe('1/1');
      expect(element.querySelector('.result')).toBeNull();
    });
  });
});
