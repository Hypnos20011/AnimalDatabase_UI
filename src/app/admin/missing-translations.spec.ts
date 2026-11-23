import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MissingTranslations } from './missing-translations';
import { AnimalService, MissingTranslation } from '../shared/animal.service';

const rows: MissingTranslation[] = [
  {
    id: 4,
    commonName: 'Okapi',
    languages: [
      { language: 'de', fields: ['habitat'] },
      { language: 'fr', fields: ['commonName', 'profile'] },
    ],
  },
];

describe('MissingTranslations', () => {
  function setup(missing = vi.fn(() => of(rows)), translate = vi.fn(() => of(rows[0]))) {
    TestBed.configureTestingModule({
      imports: [MissingTranslations],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { missingTranslations: missing, translateMissing: translate } },
      ],
    });
    const fixture = TestBed.createComponent(MissingTranslations);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, missing, translate };
  }

  it('lists the animal, the languages, the fields, and an edit link', () => {
    const { element } = setup();

    expect(element.querySelector('h2')!.textContent).toBe('Missing translations');
    expect(element.textContent).toContain('Okapi');
    expect(element.textContent).toContain('German: habitat');
    expect(element.textContent).toContain('French: name, profile');
    const edit = element.querySelector<HTMLAnchorElement>('a.edit')!;
    expect(edit.getAttribute('href')).toBe('/animals/4/edit');
    expect(edit.textContent!.trim()).toBe('Edit');
  });

  it('shows an empty state when nothing is missing', () => {
    const { element } = setup(vi.fn(() => of([])));

    expect(element.textContent).toContain('Every animal has German and French text.');
    expect(element.querySelector('button')).toBeNull();
  });

  it('removes an animal after the missing text is filled', () => {
    const translate = vi.fn(() => of({ id: 4, commonName: 'Okapi', languages: [] }));
    const { element, fixture } = setup(undefined, translate);

    element.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();

    expect(translate).toHaveBeenCalledWith(4);
    expect(element.textContent).toContain('Every animal has German and French text.');
  });

  it('shows an error when the list cannot be loaded', () => {
    const { element } = setup(vi.fn(() => throwError(() => new Error('down'))));

    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'Could not load missing translations.',
    );
  });
});