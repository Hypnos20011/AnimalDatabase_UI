import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AnimalDetail, SHARE_STATUS_MS } from './animal-detail';
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
  profile: null,
  thumbnailUrl: null,
  createdAt: '2026-10-08T10:00:00',
  updatedAt: '2026-10-08T10:00:00',
} as Animal;

const navigatorKeys = ['share', 'canShare', 'clipboard'] as const;

function mockNavigator(values: Partial<Record<(typeof navigatorKeys)[number], unknown>>) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
}

describe('AnimalDetail share button', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    for (const key of navigatorKeys) {
      delete (navigator as unknown as Record<string, unknown>)[key];
    }
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
        { provide: AdminKeyService, useValue: { unlocked: signal(false), role: signal('none') } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalDetail);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = () => element.querySelector<HTMLButtonElement>('.detail-header .share-toggle')!;
    const status = () => element.querySelector<HTMLElement>('.detail-header .share-status')!;
    const click = async () => {
      button().click();
      await fixture.whenStable();
      await Promise.resolve();
      fixture.detectChanges();
    };
    return { fixture, element, button, status, click, component: fixture.componentInstance };
  }

  it('renders an accessible share button next to the favorite star', async () => {
    const { element, button, status } = await setup();

    const toggles = element.querySelectorAll('.title-row button');
    expect(toggles[0].classList).toContain('favorite-toggle');
    expect(toggles[1]).toBe(button());
    expect(button().getAttribute('type')).toBe('button');
    expect(button().getAttribute('aria-label')).toBe('Share Okapi');
    expect(button().getAttribute('title')).toBe('Share Okapi');
    expect(button().querySelector('button, a')).toBeNull();
    expect(status().getAttribute('role')).toBe('status');
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(status().textContent!.trim()).toBe('');
  });

  it('uses the native share sheet when available', async () => {
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, canShare: vi.fn(() => true), clipboard: { writeText } });
    const { click, status } = await setup();

    await click();

    expect(share).toHaveBeenCalledWith({
      title: 'Okapi',
      text: 'Check out the Okapi on Unusual Animals',
      url: window.location.href,
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(status().textContent!.trim()).toBe('');
  });

  it('copies the link when sharing is not supported', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ clipboard: { writeText } });
    const { click, status } = await setup();

    await click();

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(status().textContent!.trim()).toBe('Link copied to clipboard');
    expect(status().classList).not.toContain('is-error');
  });

  it('copies the link when canShare rejects the data', async () => {
    const share = vi.fn(() => Promise.resolve());
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, canShare: vi.fn(() => false), clipboard: { writeText } });
    const { click } = await setup();

    await click();

    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it('clears the copied message after a few seconds', async () => {
    vi.useFakeTimers();
    mockNavigator({ clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
    const { fixture, component, status } = await setup();

    await component.share();
    fixture.detectChanges();
    expect(status().textContent!.trim()).toBe('Link copied to clipboard');

    vi.advanceTimersByTime(SHARE_STATUS_MS);
    fixture.detectChanges();
    expect(status().textContent!.trim()).toBe('');
  });

  it('does nothing when the user cancels the share sheet', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, clipboard: { writeText } });
    const { click, status } = await setup();

    await click();

    expect(share).toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(status().textContent!.trim()).toBe('');
    expect(status().classList).not.toContain('is-error');
  });

  it('falls back to copying when sharing fails', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    const writeText = vi.fn(() => Promise.resolve());
    mockNavigator({ share, clipboard: { writeText } });
    const { click, status } = await setup();

    await click();

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(status().textContent!.trim()).toBe('Link copied to clipboard');
  });

  it('shows an error when sharing and copying both fail', async () => {
    const share = vi.fn(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    mockNavigator({ share, clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) } });
    const { click, status } = await setup();

    await click();

    expect(status().textContent!.trim()).toBe('Could not share or copy the link');
    expect(status().classList).toContain('is-error');
  });

  it('shows an error when no clipboard is available', async () => {
    mockNavigator({ clipboard: undefined });
    const { click, status } = await setup();

    await click();

    expect(status().textContent!.trim()).toBe('Could not share or copy the link');
  });

  it('uses German labels and feedback', async () => {
    localStorage.setItem('language', 'de');
    mockNavigator({ clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
    const { click, button, status } = await setup();

    expect(button().getAttribute('aria-label')).toBe('Okapi teilen');
    await click();
    expect(status().textContent!.trim()).toBe('Link in die Zwischenablage kopiert');
  });

  it('uses French labels', async () => {
    localStorage.setItem('language', 'fr');
    const { button } = await setup();

    expect(button().getAttribute('aria-label')).toBe('Partager Okapi');
  });
});
