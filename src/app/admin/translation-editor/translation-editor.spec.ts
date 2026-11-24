import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AnimalTexts } from '../../animal-model/animal.model';
import { AnimalService } from '../../shared/animal.service';
import { TranslationEditor } from './translation-editor';
import { LanguageService } from '../../shared/i18n/language.service';
import { MissingTranslationCountService } from '../../shared/missing-translation-count.service';
import { Observable, of, Subject, throwError } from 'rxjs';

type DialogShim = { showModal?: () => void; close?: () => void };
const emptyTexts: AnimalTexts = {
  commonName: null,
  habitat: null,
  rangeRegion: null,
  profile: null,
};

describe('TranslationEditor', () => {
  beforeAll(() => {
    const proto = HTMLDialogElement.prototype as unknown as DialogShim;
    proto.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    proto.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  });

  async function setup(
    inputs: Record<string, unknown> = {},
    getTranslation: (id: number, language: 'de' | 'fr') => Observable<AnimalTexts> = vi.fn(() =>
      of(emptyTexts),
    ),
    saveTranslation: (
      id: number,
      language: 'de' | 'fr',
      texts: AnimalTexts,
    ) => Observable<unknown> = vi.fn(() => of(undefined)),
  ) {
    TestBed.configureTestingModule({
      providers: [{ provide: AnimalService, useValue: { getTranslation, saveTranslation } }],
    });
    const fixture: ComponentFixture<TranslationEditor> = TestBed.createComponent(TranslationEditor);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const dialog = element.querySelector('dialog') as HTMLDialogElement;
    const cancel = element.querySelector('button') as HTMLButtonElement;
    return { fixture, element, dialog, cancel, getTranslation, saveTranslation };
  }

  it('stays closed until an animal is selected', async () => {
    const { dialog } = await setup();
    expect(dialog.open).toBe(false);
  });

  it('opens for animal id zero and displays the animal name as its heading', async () => {
    const getTranslation = vi.fn(() => of(emptyTexts));
    const { dialog, element } = await setup({ animalId: 0, animalName: 'Okapi' }, getTranslation);
    const heading = element.querySelector('h2');

    expect(dialog.open).toBe(true);
    expect(heading?.textContent).toBe('Okapi');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading?.id);
    expect(getTranslation).toHaveBeenNthCalledWith(1, 0, 'de');
    expect(getTranslation).toHaveBeenNthCalledWith(2, 0, 'fr');
  });

  it('creates empty German and French text groups', async () => {
    const { fixture } = await setup();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      de: emptyTextsToForm(),
      fr: emptyTextsToForm(),
    });
  });

  it('renders and binds all German and French fields with localized labels', async () => {
    const { fixture, element } = await setup();
    const component = fixture.componentInstance;
    const language = TestBed.inject(LanguageService);
    const fields = ['commonName', 'habitat', 'rangeRegion', 'profile'] as const;
    const translations = {
      de: {
        title: 'form.german.title',
        commonName: 'form.german.commonName',
        habitat: 'form.german.habitat',
        rangeRegion: 'form.german.range',
        profile: 'form.german.profile',
      },
      fr: {
        title: 'form.french.title',
        commonName: 'form.french.commonName',
        habitat: 'form.french.habitat',
        rangeRegion: 'form.french.range',
        profile: 'form.french.profile',
      },
    } as const;

    for (const locale of ['de', 'fr', 'en'] as const) {
      language.language.set(locale);
      fixture.detectChanges();
      for (const groupName of ['de', 'fr'] as const) {
        const group = element.querySelector(`fieldset[formGroupName="${groupName}"]`)!;
        expect(group.querySelector('legend')?.textContent?.trim()).toBe(
          language.t(translations[groupName].title),
        );
        for (const field of fields) {
          const control = group.querySelector(`[formControlName="${field}"]`)! as
            HTMLInputElement | HTMLTextAreaElement;
          const expectedTag = field === 'profile' ? 'TEXTAREA' : 'INPUT';
          expect(control.tagName).toBe(expectedTag);
          expect(control.closest('label')?.textContent?.trim()).toBe(
            language.t(translations[groupName][field]),
          );
          control.value = `${locale}-${groupName}-${field}`;
          control.dispatchEvent(new Event('input'));
          expect(component.form.controls[groupName].controls[field].value).toBe(control.value);
        }
      }
    }
  });

  it('shows a localized load error and clears it when another animal is selected', async () => {
    const getTranslation = vi.fn((id: number) =>
      id === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(emptyTexts),
    );
    const { fixture, element } = await setup({ animalId: 1 }, getTranslation);
    const component = fixture.componentInstance;
    const language = TestBed.inject(LanguageService);

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      language.t('admin.missing.error'),
    );

    fixture.componentRef.setInput('animalId', 2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.error()).toBe('');
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('waits for both translations before patching the form', async () => {
    const german = new Subject<AnimalTexts>();
    const french = new Subject<AnimalTexts>();
    const getTranslation = vi.fn((_id: number, language: 'de' | 'fr') =>
      language === 'de' ? german : french,
    );
    const { fixture } = await setup({}, getTranslation);
    const component = fixture.componentInstance;

    component.form.patchValue({ de: { commonName: 'Alt' }, fr: { commonName: 'Ancien' } });
    fixture.componentRef.setInput('animalId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.getRawValue()).toEqual({
      de: emptyTextsAfterReset(),
      fr: emptyTextsAfterReset(),
    });
    german.next({ ...emptyTexts, commonName: 'Okapi' });
    german.complete();
    expect(component.form.controls.de.controls.commonName.value).toBeNull();

    french.next({ ...emptyTexts, commonName: 'Ocapí' });
    french.complete();
    expect(component.form.getRawValue()).toEqual({
      de: { ...emptyTexts, commonName: 'Okapi' },
      fr: { ...emptyTexts, commonName: 'Ocapí' },
    });
  });

  it('ignores responses for a previous animal after selection changes', async () => {
    const requests = new Map<string, Subject<AnimalTexts>>();
    const getTranslation = vi.fn((id: number, language: 'de' | 'fr') => {
      const request = new Subject<AnimalTexts>();
      requests.set(`${id}-${language}`, request);
      return request;
    });
    const { fixture } = await setup({ animalId: 1 }, getTranslation);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('animalId', 2);
    fixture.detectChanges();
    await fixture.whenStable();
    requests.get('1-de')!.next({ ...emptyTexts, commonName: 'Stale' });
    requests.get('1-fr')!.next({ ...emptyTexts, commonName: 'Ancien' });
    requests.get('2-de')!.next({ ...emptyTexts, commonName: 'Okapi' });
    requests.get('2-fr')!.next({ ...emptyTexts, commonName: 'Ocapí' });
    requests.get('2-de')!.complete();
    requests.get('2-fr')!.complete();

    expect(component.form.controls.de.controls.commonName.value).toBe('Okapi');
    expect(component.form.controls.fr.controls.commonName.value).toBe('Ocapí');
    expect(requests.get('1-de')!.observed).toBe(false);
  });

  it('resets and reloads translations when the dialog is reopened', async () => {
    const requests: { language: 'de' | 'fr'; response: Subject<AnimalTexts> }[] = [];
    const getTranslation = vi.fn((_id: number, language: 'de' | 'fr') => {
      const response = new Subject<AnimalTexts>();
      requests.push({ language, response });
      return response;
    });
    const { fixture, dialog } = await setup({ animalId: 4 }, getTranslation);
    const component = fixture.componentInstance;

    requests[0].response.next({ ...emptyTexts, commonName: 'Okapi' });
    requests[0].response.complete();
    requests[1].response.next({ ...emptyTexts, commonName: 'Ocapí' });
    requests[1].response.complete();
    expect(component.form.controls.de.controls.commonName.value).toBe('Okapi');

    fixture.componentRef.setInput('animalId', null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);

    fixture.componentRef.setInput('animalId', 4);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(component.form.controls.de.controls.commonName.value).toBeNull();
    expect(getTranslation).toHaveBeenCalledTimes(4);

    requests[2].response.next({ ...emptyTexts, commonName: 'Okapi updated' });
    requests[2].response.complete();
    requests[3].response.next({ ...emptyTexts, commonName: 'Ocapí updated' });
    requests[3].response.complete();
    expect(component.form.controls.de.controls.commonName.value).toBe('Okapi updated');
    expect(component.form.controls.fr.controls.commonName.value).toBe('Ocapí updated');
  });

  it('keeps a missing language empty when its translation returns 404', async () => {
    const french: AnimalTexts = { ...emptyTexts, commonName: 'Ocapí' };
    const getTranslation = vi.fn((_id: number, language: 'de' | 'fr') =>
      language === 'de' ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(french),
    );
    const { fixture } = await setup({ animalId: 4 }, getTranslation);

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      de: emptyTexts,
      fr: { ...emptyTexts, commonName: 'Ocapí' },
    });
  });

  it('saves both translations and converts blank fields to null', async () => {
    const saveTranslation = vi.fn(() => of(undefined));
    const { fixture } = await setup({ animalId: 0 }, undefined, saveTranslation);
    const component = fixture.componentInstance;
    const saved = vi.fn();
    component.saved.subscribe(saved);
    component.form.patchValue({
      de: {
        commonName: ' Okapi ',
        habitat: '',
        rangeRegion: '  ',
        profile: 'A mammal.',
      },
      fr: {
        commonName: ' Ocapí ',
        habitat: 'Forêt',
        rangeRegion: '',
        profile: 'Un mammifère.',
      },
    });

    component.save();

    expect(saveTranslation).toHaveBeenNthCalledWith(1, 0, 'de', {
      commonName: 'Okapi',
      habitat: null,
      rangeRegion: null,
      profile: 'A mammal.',
    });
    expect(saveTranslation).toHaveBeenNthCalledWith(2, 0, 'fr', {
      commonName: 'Ocapí',
      habitat: 'Forêt',
      rangeRegion: null,
      profile: 'Un mammifère.',
    });
    expect(saved).toHaveBeenCalledOnce();
    expect(component.saving()).toBe(false);
  });

  it('disables Save and ignores repeated submissions while both requests are pending', async () => {
    const german = new Subject<unknown>();
    const french = new Subject<unknown>();
    const saveTranslation = vi.fn((_id: number, language: 'de' | 'fr') =>
      language === 'de' ? german : french,
    );
    const { fixture, element } = await setup({ animalId: 7 }, undefined, saveTranslation);
    const component = fixture.componentInstance;
    const saved = vi.fn();
    component.saved.subscribe(saved);

    component.save();
    fixture.detectChanges();
    const saveButton = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(component.saving()).toBe(true);
    expect(saveButton.disabled).toBe(true);

    component.save();
    expect(saveTranslation).toHaveBeenCalledTimes(2);

    german.next(undefined);
    german.complete();
    french.next(undefined);
    french.complete();

    expect(component.saving()).toBe(false);
    expect(saved).toHaveBeenCalledOnce();
  });

  it('shows a save error without emitting saved and refreshes the count', async () => {
    const saveTranslation = vi.fn((_id: number, language: 'de' | 'fr') =>
      language === 'de' ? throwError(() => new Error('partial failure')) : of(undefined),
    );
    const { fixture } = await setup({ animalId: 3 }, undefined, saveTranslation);
    const component = fixture.componentInstance;
    const saved = vi.fn();
    component.saved.subscribe(saved);
    const refresh = vi.spyOn(TestBed.inject(MissingTranslationCountService), 'refresh');

    component.save();

    expect(component.error()).toBe(TestBed.inject(LanguageService).t('admin.missing.saveError'));
    expect(component.saving()).toBe(false);
    expect(saved).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('does not reopen when the selected animal changes while the dialog is open', async () => {
    const { fixture, dialog } = await setup({ animalId: 0, animalName: 'Okapi' });
    const showModal = vi.spyOn(dialog, 'showModal');

    fixture.componentRef.setInput('animalId', 2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(showModal).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
  });

  it('closes when the selected animal is cleared', async () => {
    const { fixture, dialog } = await setup({ animalId: 4, animalName: 'Okapi' });

    fixture.componentRef.setInput('animalId', null);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.open).toBe(false);
  });

  it('emits closed when Cancel is clicked', async () => {
    const { fixture, cancel } = await setup({ animalId: 4, animalName: 'Okapi' });
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    cancel.click();

    expect(closed).toHaveBeenCalledOnce();
  });

  it('localizes the Cancel button', async () => {
    const { fixture, cancel } = await setup({ animalId: 4, animalName: 'Okapi' });
    const language = TestBed.inject(LanguageService);

    for (const locale of ['de', 'fr', 'en'] as const) {
      language.language.set(locale);
      fixture.detectChanges();
      expect(cancel.textContent!.trim()).toBe(language.t('form.cancel'));
    }
  });

  it('prevents native Escape closure and emits closed', async () => {
    const { fixture, dialog } = await setup({ animalId: 4, animalName: 'Okapi' });
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    const escape = new Event('cancel', { cancelable: true });

    dialog.dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(closed).toHaveBeenCalledOnce();
  });
});

function emptyTextsToForm() {
  return { commonName: '', habitat: '', rangeRegion: '', profile: '' };
}

function emptyTextsAfterReset() {
  return { commonName: null, habitat: null, rangeRegion: null, profile: null };
}
