import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail } from './animal-detail';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';
import { AdminKeyService } from '../admin/admin-key.service';

const okapi = {
  id: 2,
  commonName: 'Okapi',
  scientificName: 'Okapia johnstoni',
  family: 'Giraffidae',
  taxonomicClass: 'mammal',
  isDomesticated: false,
  lengthMmMin: null,
  lengthMmMax: null,
  heightMmMin: null,
  heightMmMax: null,
  weightGramsMin: null,
  weightGramsMax: null,
  lifespanMonthsMin: null,
  lifespanMonthsMax: null,
  iucnStatus: 'endangered',
  habitat: null,
  habitatType: null,
  rangeRegion: null,
  profile: null,
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} as Animal;

describe('AnimalDetail print button', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  async function setup() {
    TestBed.configureTestingModule({
      imports: [AnimalDetail],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: { getById: vi.fn(() => of(okapi)), getImages: vi.fn(() => of([])) },
        },
        {
          provide: AdminKeyService,
          useValue: { key: signal(null), unlocked: signal(false), role: signal('none') },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = () => element.querySelector<HTMLButtonElement>('.detail-header .print-toggle')!;
    return { fixture, element, button };
  }

  it('renders an accessible print button right after the share button', async () => {
    const { element, button } = await setup();

    const toggles = element.querySelectorAll('.title-row button');
    expect(toggles[1].classList).toContain('share-toggle');
    expect(toggles[2]).toBe(button());
    expect(button().getAttribute('type')).toBe('button');
    expect(button().getAttribute('aria-label')).toBe('Print Okapi');
    expect(button().getAttribute('title')).toBe('Print Okapi');
  });

  it('groups favorite, share, print and compare in one labelled toolbar', async () => {
    const { element, button } = await setup();

    const toolbar = element.querySelector('.title-row .detail-toolbar')!;
    expect(toolbar.getAttribute('role')).toBe('group');
    expect(toolbar.getAttribute('aria-label')).toBe('Actions');
    const buttons = toolbar.querySelectorAll('button');
    expect(buttons.length).toBe(4);
    expect(buttons[0].classList).toContain('favorite-toggle');
    expect(buttons[1].classList).toContain('share-toggle');
    expect(buttons[2]).toBe(button());
    expect(buttons[3].classList).toContain('compare-toggle');
    expect(element.querySelector('.title-row > h2 + .detail-toolbar')).toBe(toolbar);
  });

  it('opens the browser print dialog when clicked', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const { button } = await setup();

    button().click();

    expect(print).toHaveBeenCalledTimes(1);
  });

  it('uses German labels', async () => {
    localStorage.setItem('language', 'de');
    const { button } = await setup();

    expect(button().getAttribute('aria-label')).toBe('Okapi drucken');
    expect(button().getAttribute('title')).toBe('Okapi drucken');
  });

  it('uses French labels', async () => {
    localStorage.setItem('language', 'fr');
    const { button } = await setup();

    expect(button().getAttribute('aria-label')).toBe('Imprimer Okapi');
  });
});
