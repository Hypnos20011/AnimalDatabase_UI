import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AnimalService, MissingTranslation } from './animal.service';
import { MissingTranslationCountService } from './missing-translation-count.service';

const missing: MissingTranslation[] = [
  { id: 1, commonName: 'Okapi', languages: [{ language: 'de', fields: ['habitat'] }] },
  { id: 2, commonName: 'Shoebill', languages: [{ language: 'fr', fields: ['profile'] }] },
];

describe('MissingTranslationCountService', () => {
  function setup(missingTranslations = vi.fn(() => of(missing))) {
    TestBed.configureTestingModule({
      providers: [
        { provide: AnimalService, useValue: { missingTranslations } },
      ],
    });
    return {
      count: TestBed.inject(MissingTranslationCountService),
      missingTranslations,
    };
  }

  it('fetches and counts missing translations only after unlock', () => {
    const { count, missingTranslations } = setup();

    count.refresh();
    expect(missingTranslations).not.toHaveBeenCalled();
    expect(count.count()).toBe(0);

    count.setUnlocked(true);
    expect(missingTranslations).toHaveBeenCalledOnce();
    expect(count.count()).toBe(2);
  });

  it('refreshes the count and clears it when locked', () => {
    const missingTranslations = vi
      .fn()
      .mockReturnValueOnce(of(missing))
      .mockReturnValueOnce(of([missing[0]]));
    const { count } = setup(missingTranslations);

    count.setUnlocked(true);
    expect(count.count()).toBe(2);
    count.refresh();
    expect(count.count()).toBe(1);

    count.setUnlocked(false);
    expect(count.count()).toBe(0);
  });

  it('ignores a pending response after the admin session locks', () => {
    const response = new Subject<MissingTranslation[]>();
    const { count } = setup(vi.fn(() => response));

    count.setUnlocked(true);
    count.setUnlocked(false);
    response.next(missing);

    expect(count.count()).toBe(0);
  });

  it('keeps the last successful count when refreshing fails', () => {
    const missingTranslations = vi
      .fn()
      .mockReturnValueOnce(of(missing))
      .mockReturnValueOnce(throwError(() => new Error('offline')));
    const { count } = setup(missingTranslations);

    count.setUnlocked(true);
    expect(count.count()).toBe(2);
    count.refresh();
    expect(count.count()).toBe(2);
  });

  it('keeps the initial count at zero when the first load fails', () => {
    const { count } = setup(vi.fn(() => throwError(() => new Error('offline'))));

    expect(count.count()).toBe(0);
    count.setUnlocked(true);
    expect(count.count()).toBe(0);
  });
});
