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

  it('shows Random animal, Quiz and Stats in the top bar while locked', async () => {
    const { navLinks } = await render();
    const links = navLinks();

    expect(links.map((link) => link.textContent!.trim())).toEqual([
      'Random animal',
      'Quiz',
      'Stats',
    ]);
    links[0].click();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('adds Add animal to the top bar once unlocked', async () => {
    unlocked.set(true);
    const { navLinks } = await render();
    const links = navLinks();

    expect(links.map((link) => link.textContent!.trim())).toEqual([
      'Random animal',
      'Add animal',
      'Quiz',
      'Stats',
    ]);
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

    function button(element: HTMLElement): HTMLButtonElement {
      return element.querySelector<HTMLButtonElement>('button.lang-button')!;
    }

    function menu(element: HTMLElement): HTMLElement {
      return element.querySelector<HTMLElement>('#lang-menu')!;
    }

    function items(element: HTMLElement): HTMLButtonElement[] {
      return Array.from(
        menu(element).querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
      );
    }

    async function open(
      fixture: { detectChanges(): void; whenStable(): Promise<void> },
      element: HTMLElement,
    ) {
      button(element).click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('offers English, Deutsch and Français from a closed menu', async () => {
      const { element } = await render();

      expect(button(element).getAttribute('aria-expanded')).toBe('false');
      expect(button(element).getAttribute('aria-haspopup')).toBe('menu');
      expect(button(element).textContent).toContain('EN');
      expect(menu(element).classList.contains('is-open')).toBe(false);
      expect(items(element).map((item) => item.getAttribute('aria-label'))).toEqual([
        'English',
        'Deutsch',
        'Français',
      ]);
      expect(items(element).map((item) => item.querySelector('.code')!.textContent)).toEqual([
        'EN',
        'DE',
        'FR',
      ]);
    });

    it('starts on English with English texts', async () => {
      const { element, navLinks } = await render();
      expect(button(element).getAttribute('aria-label')).toBe('Language, English');
      expect(items(element)[0].getAttribute('aria-checked')).toBe('true');
      expect(navLinks().map((l) => l.textContent!.trim())).toEqual([
        'Random animal',
        'Quiz',
        'Stats',
      ]);
    });

    it('switches the header and footer to German when Deutsch is picked', async () => {
      const { fixture, element, navLinks } = await render();
      await open(fixture, element);
      items(element)[1].click();
      fixture.detectChanges();

      expect(navLinks().map((l) => l.textContent!.trim())).toEqual([
        'Zufälliges Tier',
        'Quiz',
        'Statistik',
      ]);
      expect(element.querySelector('.site-nav')!.getAttribute('aria-label')).toBe('Schnellzugriff');
      expect(button(element).getAttribute('aria-label')).toBe('Sprache, Deutsch');
      expect(button(element).textContent).toContain('DE');
      expect(menu(element).classList.contains('is-open')).toBe(false);
      expect(document.activeElement).toBe(button(element));
      expect(localStorage.getItem('language')).toBe('de');
      expect(document.documentElement.lang).toBe('de');
    });

    it('shows German immediately when German was stored', async () => {
      localStorage.setItem('language', 'de');
      const { element, navLinks } = await render();
      expect(button(element).textContent).toContain('DE');
      expect(button(element).getAttribute('aria-label')).toBe('Sprache, Deutsch');
      expect(items(element)[1].getAttribute('aria-checked')).toBe('true');
      expect(navLinks().map((l) => l.textContent!.trim())).toEqual([
        'Zufälliges Tier',
        'Quiz',
        'Statistik',
      ]);
    });

    it('moves through the menu with the keyboard and closes on Escape', async () => {
      const { fixture, element } = await render();
      button(element).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(menu(element).classList.contains('is-open')).toBe(true);
      expect(document.activeElement).toBe(items(element)[0]);

      menu(element).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(document.activeElement).toBe(items(element)[1]);
      menu(element).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(document.activeElement).toBe(items(element)[0]);
      menu(element).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(document.activeElement).toBe(items(element)[2]);

      menu(element).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(menu(element).classList.contains('is-open')).toBe(false);
      expect(document.activeElement).toBe(button(element));
    });

    it('closes the menu when the click is outside it', async () => {
      const { fixture, element } = await render();
      await open(fixture, element);
      expect(menu(element).classList.contains('is-open')).toBe(true);

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(menu(element).classList.contains('is-open')).toBe(false);
    });

    it('uses the French language label', async () => {
      localStorage.setItem('language', 'fr');
      const { element } = await render();
      expect(button(element).getAttribute('aria-label')).toBe('Langue, Français');
      expect(button(element).textContent).toContain('FR');
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
