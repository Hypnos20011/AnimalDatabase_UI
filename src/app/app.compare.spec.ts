import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RandomAnimalService } from './shared/random-animal.service';
import { AdminKeyService } from './admin/admin-key.service';
import { COMPARE_STORAGE, CompareService } from './compare/compare.service';

describe('App compare link', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: RandomAnimalService, useValue: { open: vi.fn() } },
        { provide: AdminKeyService, useValue: { unlocked: signal(false), clear: vi.fn() } },
      ],
    }).compileComponents();
  });
  afterEach(() => localStorage.clear());

  async function render() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const navLinks = () =>
      Array.from(element.querySelectorAll<HTMLElement>('.site-nav .nav-link')).map((link) => ({
        text: link.textContent!.trim(),
        href: link.getAttribute('href'),
      }));
    return { fixture, navLinks };
  }

  it('shows a compare link with the count once an animal is picked', async () => {
    localStorage.setItem(COMPARE_STORAGE, JSON.stringify([{ id: 1, commonName: 'Okapi' }]));
    const { navLinks } = await render();

    expect(navLinks()).toEqual([
      { text: 'Random animal', href: null },
      { text: 'Compare (1/2)', href: '/compare' },
      { text: 'Stats', href: '/stats' },
    ]);
  });

  it('updates and hides the link as the selection changes', async () => {
    const { fixture, navLinks } = await render();
    const compare = TestBed.inject(CompareService);

    compare.add(1, 'Okapi');
    compare.add(2, 'Axolotl');
    fixture.detectChanges();
    expect(navLinks()[1].text).toBe('Compare (2/2)');

    compare.clear();
    fixture.detectChanges();
    expect(navLinks().map((link) => link.text)).toEqual(['Random animal', 'Stats']);
  });
});
