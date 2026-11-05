import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RandomAnimalService } from './shared/random-animal.service';
import { AdminKeyService } from './admin/admin-key.service';

describe('App', () => {
  const open = vi.fn();
  const clear = vi.fn();
  const unlocked = signal(false);

  beforeEach(async () => {
    open.mockReset();
    clear.mockReset();
    unlocked.set(false);
    localStorage.clear();
    document.documentElement.lang = '';
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: RandomAnimalService, useValue: { open } },
        { provide: AdminKeyService, useValue: { unlocked, clear } },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const navLinks = () => Array.from(element.querySelectorAll<HTMLElement>('.site-nav .nav-link'));
    return { fixture, element, navLinks };
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const { element } = await render();
    expect(element.querySelector('h1')?.textContent).toContain('Unusual Animals');
  });

  it('shows Random animal and Stats in the top bar while locked', async () => {
    const { navLinks } = await render();
    const links = navLinks();

    expect(links.map((link) => link.textContent!.trim())).toEqual(['Random animal', 'Stats']);
    links[0].click();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('adds Add animal to the top bar once unlocked', async () => {
    unlocked.set(true);
    const { navLinks } = await render();
    const links = navLinks();

    expect(links.map((link) => link.textContent!.trim())).toEqual(['Random animal', 'Add animal', 'Stats']);
    expect(links[1].getAttribute('href')).toBe('/animals/new');
  });

  it('has a quiet Admin link in the footer while locked', async () => {
    const { element } = await render();
    const link = element.querySelector<HTMLAnchorElement>('.site-footer .admin')!;

    expect(link.textContent!.trim()).toBe('Admin');
    expect(link.getAttribute('href')).toBe('/admin');
    expect(element.querySelector('.site-footer .lock')).toBeNull();
  });

  it('swaps the footer link for Lock once unlocked', async () => {
    unlocked.set(true);
    const { element } = await render();
    const lock = element.querySelector<HTMLButtonElement>('.site-footer .lock')!;

    expect(lock.textContent!.trim()).toBe('Lock');
    expect(element.querySelector('.site-footer .admin')).toBeNull();
    lock.click();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  describe('language switch', () => {
    afterEach(() => localStorage.clear());

    function select(element: HTMLElement): HTMLSelectElement {
      return element.querySelector<HTMLSelectElement>('.site-nav .language-select')!;
    }

    it('offers every supported language in upper case', async () => {
      const { element } = await render();
      const options = Array.from(select(element).options).map((o) => [o.value, o.textContent!.trim()]);
      expect(options).toEqual([
        ['en', 'EN'],
        ['de', 'DE'],
        ['fr', 'FR'],
      ]);
    });

    it('starts on English with English texts', async () => {
      const { element, navLinks } = await render();
      expect(select(element).value).toBe('en');
      expect(navLinks().map((l) => l.textContent!.trim())).toEqual(['Random animal', 'Stats']);
      expect(select(element).getAttribute('aria-label')).toBe('Language');
    });

    it('switches the header and footer to German when DE is picked', async () => {
      const { fixture, element, navLinks } = await render();
      const languageSelect = select(element);
      languageSelect.value = 'de';
      languageSelect.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(navLinks().map((l) => l.textContent!.trim())).toEqual(['Zufälliges Tier', 'Statistik']);
      expect(element.querySelector('.site-nav')!.getAttribute('aria-label')).toBe('Schnellzugriff');
      expect(languageSelect.getAttribute('aria-label')).toBe('Sprache');
      expect(localStorage.getItem('language')).toBe('de');
      expect(document.documentElement.lang).toBe('de');
    });

    it('shows German and selects DE when German was stored', async () => {
      localStorage.setItem('language', 'de');
      const { element, navLinks } = await render();
      expect(select(element).value).toBe('de');
      expect(navLinks().map((l) => l.textContent!.trim())).toEqual(['Zufälliges Tier', 'Statistik']);
    });

    it('translates the unlocked footer', async () => {
      localStorage.setItem('language', 'de');
      unlocked.set(true);
      const { element } = await render();
      expect(element.querySelector('.site-footer .footer-note')!.textContent!.trim()).toBe(
        'Bearbeiten freigeschaltet',
      );
      expect(element.querySelector('.site-footer .lock')!.textContent!.trim()).toBe('Sperren');
    });
  });
});