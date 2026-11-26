import { TestBed } from '@angular/core/testing';
import { provideLockedAdmin } from './animals-list-test-support';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AnimalsList } from './animals-list';
import { AnimalService } from '../shared/animal.service';
import { SearchService } from './search.service';
import {
  RECENTLY_VIEWED_STORAGE,
  RecentlyViewedService,
} from './recently-viewed.service';

describe('AnimalsList recently viewed', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  async function setup(seed?: { id: number; commonName: string }[]) {
    if (seed) {
      localStorage.setItem(RECENTLY_VIEWED_STORAGE, JSON.stringify(seed));
    }
    TestBed.configureTestingModule({
      imports: [AnimalsList],
      providers: [
        provideLockedAdmin(),
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of([
          { id: 2, commonName: 'Okapi' },
          { id: 4, commonName: 'Axolotl' },
          { id: 7, commonName: 'Quokka' },
        ])) } },
        {
          provide: SearchService,
          useValue: { getTop: vi.fn(() => of([])), record: vi.fn(() => of(undefined)) },
        },
      ],
    });
    const fixture = TestBed.createComponent(AnimalsList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const section = () => element.querySelector<HTMLElement>('.recently-viewed');
    return { fixture, element, section, viewed: TestBed.inject(RecentlyViewedService) };
  }

  it('hides the section when nothing was viewed', async () => {
    const { section } = await setup();
    expect(section()).toBeNull();
  });

  it('shows links for recently viewed animals', async () => {
    const { section } = await setup([
      { id: 2, commonName: 'Okapi' },
      { id: 4, commonName: 'Axolotl' },
    ]);

    expect(section()!.querySelector('h3')!.textContent).toContain('Recently viewed');
    const links = Array.from(section()!.querySelectorAll('a.recent-link')).map((link) => ({
      text: link.textContent!.trim(),
      href: link.getAttribute('href'),
    }));
    expect(links).toEqual([
      { text: 'Okapi', href: '/animals/2' },
      { text: 'Axolotl', href: '/animals/4' },
    ]);
  });

  it('shows the section after a new animal is recorded', async () => {
    const { fixture, section, viewed } = await setup();
    expect(section()).toBeNull();

    viewed.record(7, 'Quokka');
    fixture.detectChanges();

    expect(section()).not.toBeNull();
    expect(section()!.querySelector('.recent-link')!.textContent!.trim()).toBe('Quokka');
  });

  it('uses current names and hides missing entries without removing history', async () => {
    const { section, viewed } = await setup([
      { id: 2, commonName: 'Old name' },
      { id: 99, commonName: 'Missing' },
    ]);
    expect(section()!.querySelector('.recent-link')!.textContent!.trim()).toBe('Okapi');
    expect(section()!.querySelectorAll('.recent-link')).toHaveLength(1);
    expect(viewed.recent().map((item) => item.id)).toEqual([2, 99]);
  });
});
