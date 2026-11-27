import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { MissingTranslations } from './missing-translations';
import { AnimalService, MissingTranslation } from '../shared/animal.service';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

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

const rowsForSorting: MissingTranslation[] = [
  { id: 1, commonName: 'Zebra', languages: [{ language: 'de', fields: ['habitat'] }] },
  { id: 4, commonName: 'Okapi', languages: [{ language: 'fr', fields: ['profile'] }] },
  { id: 3, commonName: 'Alpaca', languages: [{ language: 'fr', fields: ['commonName'] }] },
];

describe('MissingTranslations', () => {
  beforeAll(() => {
    const proto = HTMLDialogElement.prototype as unknown as {
      showModal?: () => void;
      close?: () => void;
    };
    proto.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  function setup(
    missing = vi.fn(() => of(rows)),
    translate = vi.fn(() => of(rows[0])),
  ) {
    const refresh = vi.fn();
    TestBed.configureTestingModule({
      imports: [MissingTranslations],
      providers: [
        provideRouter([]),
        {
          provide: AnimalService,
          useValue: {
            getTranslation: vi.fn(() => of({ commonName: null, habitat: null, rangeRegion: null, profile: null })),
            missingTranslations: missing,
            translateMissing: translate,
          },
        },
        { provide: MissingTranslationCountService, useValue: { refresh } },
      ],
    });
    const fixture = TestBed.createComponent(MissingTranslations);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, missing, translate, refresh };
  }

  it('lists only missing translations with English labels and an edit link', () => {
    const { fixture, element } = setup();

    expect(element.querySelector('h2')!.textContent).toBe('Translations');
    expect(element.querySelector('.page-head h2')!.textContent).toBe('Translations');
    expect(element.querySelector('.page-head a')!.textContent).toContain('Admin');
    expect(element.querySelector('.page-head a')!.getAttribute('href')).toBe('/admin');
    expect(element.textContent).toContain('German: habitat');
    expect(element.textContent).toContain('French: name, profile');
    expect(element.textContent).not.toContain('Complete');
    const edit = element.querySelector<HTMLButtonElement>('button.edit')!;
    expect(edit.type).toBe('button');
    expect(edit.textContent!.trim()).toBe('Edit');
    expect(element.querySelector('a[href="/animals/4/edit"]')).not.toBeNull();

    edit.click();
    fixture.detectChanges();
    const dialog = element.querySelector<HTMLDialogElement>('app-translation-editor dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')!.textContent).toBe('Okapi');
    expect(dialog.querySelector('button')!.textContent!.trim()).toBe('Cancel');

    dialog.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing()).toBeNull();
    expect(dialog.open).toBe(false);
  });

  it('sorts missing rows alphabetically by common name', () => {
    const { fixture, element } = setup(vi.fn(() => of(rowsForSorting)));

    expect(fixture.componentInstance.entries().map((entry) => entry.commonName)).toEqual([
      'Alpaca',
      'Okapi',
      'Zebra',
    ]);
    expect(
      Array.from(element.querySelectorAll('.gaps > li .gap-head > a:first-child')).map((link) =>
        link.textContent,
      ),
    ).toEqual(['Alpaca', 'Okapi', 'Zebra']);
  });

  it('shows the empty state when no animals have missing translations', () => {
    const { element } = setup(vi.fn(() => of([])));

    expect(element.textContent).toContain('Every animal has German and French text.');
    expect(element.querySelector('.gaps > li')).toBeNull();
    expect(element.textContent).not.toContain('Complete');
  });

  it('shows the loading state only for the initial request', () => {
    const request = new Subject<MissingTranslation[]>();
    const missing = vi.fn(() => request);
    const { fixture, element } = setup(missing);

    expect(missing).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.loading()).toBe(true);
    expect(element.textContent).toContain('Loading...');

    request.next(rows);
    request.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(element.textContent).not.toContain('Loading...');
  });

  it('removes a fully translated animal and refreshes the count', () => {
    const translate = vi.fn(() => of({ id: 4, commonName: 'Okapi', languages: [] }));
    const { fixture, element, refresh } = setup(undefined, translate);

    element.querySelector<HTMLButtonElement>('button.btn-primary')!.click();
    fixture.detectChanges();

    expect(translate).toHaveBeenCalledWith(4);
    expect(fixture.componentInstance.entries()).toEqual([]);
    expect(element.textContent).not.toContain('Okapi');
    expect(element.textContent).toContain('Every animal has German and French text.');
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('removes a completed row after an editor save without showing loading', () => {
    const reload = new Subject<MissingTranslation[]>();
    const missing = vi.fn().mockReturnValueOnce(of(rows)).mockReturnValueOnce(reload);
    const { fixture, element, refresh } = setup(missing);
    const component = fixture.componentInstance;
    component.editing.set(rows[0]);

    component.onEditorSaved();
    fixture.detectChanges();

    expect(missing).toHaveBeenCalledTimes(2);
    expect(component.loading()).toBe(false);
    expect(element.textContent).not.toContain('Loading...');
    expect(element.textContent).toContain('Okapi');
    expect(refresh).toHaveBeenCalledOnce();

    reload.next([]);
    reload.complete();
    fixture.detectChanges();

    expect(component.entries()).toEqual([]);
    expect(element.textContent).not.toContain('Okapi');
    expect(element.textContent).toContain('Every animal has German and French text.');
  });

  it('keeps visible rows when a reload after save fails', () => {
    const missing = vi.fn().mockReturnValueOnce(of(rows)).mockReturnValueOnce(throwError(() => new Error('down')));
    const { fixture, element } = setup(missing);
    const component = fixture.componentInstance;

    component.onEditorSaved();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(element.textContent).not.toContain('Loading...');
    expect(component.entries()).toEqual(rows);
    expect(element.textContent).toContain('Okapi');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not load missing translations.',
    );
  });

  it('uses the English access-denied message for a forbidden translation', () => {
    const { element, fixture } = setup(
      undefined,
      vi.fn(() => throwError(() => new HttpErrorResponse({ status: 403 }))),
    );

    fixture.componentInstance.translate(rows[0]);
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'You do not have permission to perform this action.',
    );
  });

  it('uses an English translation error message for other failures', () => {
    const { element, fixture } = setup(undefined, vi.fn(() => throwError(() => new Error('down'))));

    fixture.componentInstance.translate(rows[0]);
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not translate missing fields.',
    );
  });

  it('shows an error when the list cannot be loaded', () => {
    const { element } = setup(vi.fn(() => throwError(() => new Error('down'))));

    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'Could not load missing translations.',
    );
  });
});
