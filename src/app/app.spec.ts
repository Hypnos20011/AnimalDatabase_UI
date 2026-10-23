import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RandomAnimalService } from './random-animal.service';

describe('App', () => {
  const open = vi.fn();

  beforeEach(async () => {
    open.mockReset();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: RandomAnimalService, useValue: { open } }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Animal Database');
  });

  it('puts Random animal and Add animal in the top bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.site-nav .nav-link'),
    );

    expect(links.map((link) => link.textContent!.trim())).toEqual(['Random animal', 'Add animal']);
    expect(links[1].getAttribute('href')).toBe('/animals/new');

    links[0].click();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
