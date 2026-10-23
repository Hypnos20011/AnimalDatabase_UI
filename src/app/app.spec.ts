import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RandomAnimalService } from './random-animal.service';
import { AdminKeyService } from './admin/admin-key.service';

describe('App', () => {
  const open = vi.fn();
  const clear = vi.fn();
  const unlocked = signal(false);

  beforeEach(async () => {
    open.mockReset();
    clear.mockReset();
    unlocked.set(false);
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
    expect(element.querySelector('h1')?.textContent).toContain('Animal Database');
  });

  it('shows only Random animal in the top bar while locked', async () => {
    const { navLinks } = await render();
    const links = navLinks();

    expect(links.map((link) => link.textContent!.trim())).toEqual(['Random animal']);
    links[0].click();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('adds Add animal to the top bar once unlocked', async () => {
    unlocked.set(true);
    const { navLinks } = await render();
    const links = navLinks();

    expect(links.map((link) => link.textContent!.trim())).toEqual(['Random animal', 'Add animal']);
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
});
