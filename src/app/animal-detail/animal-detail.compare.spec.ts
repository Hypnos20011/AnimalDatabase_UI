import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AdminKeyService } from '../admin/admin-key.service';
import { COMPARE_STORAGE, CompareService } from '../compare/compare.service';

const okapi = {
  id: 2,
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  taxonomicClass: 'mammal',
  isDomesticated: false,
  sizeLengthCmMin: null,
  sizeLengthCmMax: null,
  sizeHeightCmMin: null,
  sizeHeightCmMax: null,
  weightKgMin: null,
  weightKgMax: null,
  lifespanYearsMin: null,
  lifespanYearsMax: null,
  iucnStatus: 'endangered',
  habitat: null,
  habitatType: null,
  rangeRegion: null,
  profile: 'Forest giraffe. Fun fact: Cleans its ears with its tongue.',
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} as Animal;

describe('AnimalDetail compare button', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup(seed?: { id: number; commonName: string }[]) {
    if (seed) localStorage.setItem(COMPARE_STORAGE, JSON.stringify(seed));
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getById: vi.fn(() => of(okapi)), getImages: vi.fn(() => of([])) },
        },
        { provide: AdminKeyService, useValue: { unlocked: signal(false), role: signal('none') } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = () =>
      element.querySelector<HTMLButtonElement>('.detail-toolbar button.compare-toggle')!;
    const hint = () => element.querySelector<HTMLElement>('.compare-hint');
    const click = () => {
      button().click();
      fixture.detectChanges();
    };
    return { fixture, element, button, hint, click, compare: TestBed.inject(CompareService) };
  }

  it('renders an accessible compare toggle in the toolbar', async () => {
    const { button, hint } = await setup();

    expect(button().getAttribute('type')).toBe('button');
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(button().getAttribute('aria-label')).toBe('Add Okapi to compare');
    expect(button().getAttribute('title')).toBe('Add Okapi to compare');
    expect(hint()).toBeNull();
  });

  it('adds the animal and shows how many are picked', async () => {
    const { button, hint, click, compare } = await setup();

    click();

    expect(compare.selection()).toEqual([{ id: 2, commonName: 'Okapi' }]);
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().classList).toContain('is-compared');
    expect(button().getAttribute('aria-label')).toBe('Remove Okapi from compare');
    expect(hint()!.textContent!.trim()).toBe('Picked for comparison (1/2).');
    expect(hint()!.querySelector('a')).toBeNull();
  });

  it('links to the comparison once two are picked', async () => {
    const { hint, click } = await setup([{ id: 7, commonName: 'Axolotl' }]);

    click();

    const link = hint()!.querySelector('a')!;
    expect(link.textContent!.trim()).toBe('Compare Axolotl and Okapi');
    expect(link.getAttribute('href')).toBe('/compare');
  });

  it('removes the animal again', async () => {
    const { hint, click, compare } = await setup([{ id: 2, commonName: 'Okapi' }]);

    click();

    expect(compare.selection()).toEqual([]);
    expect(hint()).toBeNull();
  });

  it('refreshes a stored name with the loaded one', async () => {
    const { compare } = await setup([{ id: 2, commonName: 'Old name' }]);

    expect(compare.selection()).toEqual([{ id: 2, commonName: 'Okapi' }]);
  });

  it('still splits the fun fact from the profile', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('Cleans its ears with its tongue.');
    expect(element.textContent).not.toContain('Fun fact: Cleans');
  });
});
