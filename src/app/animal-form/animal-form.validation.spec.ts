import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AnimalForm } from './animal-form';
import { AnimalService } from '../shared/animal.service';

describe('AnimalForm number checks', () => {
  function setup(create = vi.fn((): Observable<unknown> => of({}))) {
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: { getAll: vi.fn(() => of([])), create } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.detectChanges();
    const form = fixture.componentInstance;
    form.form.controls.commonName.setValue('Blue whale');
    return { fixture, form, create };
  }

  it('blocks saving when a minimum is above its maximum', () => {
    const { fixture, form, create } = setup();
    form.form.patchValue({ weightKgMin: 10, weightKgMax: 5 });
    form.submit();
    fixture.detectChanges();
    expect(create).not.toHaveBeenCalled();
    expect(form.rangeReversed('weightKgMin')).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "The minimum can't be larger than the maximum.",
    );
  });

  it('accepts equal values and a missing side', () => {
    const { form } = setup();
    form.form.patchValue({ weightKgMin: 5, weightKgMax: 5, lifespanYearsMin: 3 });
    expect(form.form.valid).toBe(true);
  });

  it('accepts a blue whale but not a weight over the limit', () => {
    const { form } = setup();
    form.form.controls.weightKgMax.setValue(136000);
    expect(form.form.valid).toBe(true);
    form.form.controls.weightKgMax.setValue(10000000);
    expect(form.form.valid).toBe(false);
  });

  it('wants whole years for the lifespan', () => {
    const { form } = setup();
    form.form.controls.lifespanYearsMax.setValue(2.5);
    expect(form.form.valid).toBe(false);
  });

  it('sends the source link with the animal', () => {
    const { form, create } = setup();
    form.form.controls.sourceUrl.setValue('https://en.wikipedia.org/wiki/Blue_whale');
    form.submit();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: 'https://en.wikipedia.org/wiki/Blue_whale' }),
    );
  });

  it('rejects a profile that is too long for the database', () => {
    const { form } = setup();
    form.form.controls.profile.setValue('a'.repeat(20001));
    expect(form.form.valid).toBe(false);
  });

  it('rejects a source that is not a link', () => {
    const { form } = setup();
    form.form.controls.sourceUrl.setValue('wikipedia');
    expect(form.form.valid).toBe(false);
  });

  it('only accepts https source links', () => {
    const { form } = setup();
    for (const bad of ['http://en.wikipedia.org/wiki/Blue_whale', 'javascript:alert(1)', 'https://']) {
      form.form.controls.sourceUrl.setValue(bad);
      expect(form.form.controls.sourceUrl.invalid).toBe(true);
    }
    form.form.controls.sourceUrl.setValue('https://en.wikipedia.org/wiki/Blue_whale');
    expect(form.form.controls.sourceUrl.valid).toBe(true);
    form.form.controls.sourceUrl.setValue('');
    expect(form.form.controls.sourceUrl.valid).toBe(true);
  });

  it('shows the reason the API gives for a failed save', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { errors: { WeightKgMin: ["Weight: the minimum can't be larger than the maximum."] } },
    });
    const { form } = setup(vi.fn(() => throwError(() => error)));
    form.submit();
    expect(form.error()).toBe("Weight: the minimum can't be larger than the maximum.");
  });

  it('accepts https image source pages and rejects anything else', () => {
    const { form } = setup();
    const control = form.form.controls.otherImageSourcePageUrl;
    for (const bad of ['http://commons.wikimedia.org/wiki/File:X.jpg', 'javascript:alert(1)', 'commons']) {
      control.setValue(bad);
      expect(control.invalid).toBe(true);
    }
    control.setValue('https://commons.wikimedia.org/wiki/File:Okapia_johnstoni_17zz.jpg');
    expect(control.valid).toBe(true);
    control.setValue('');
    expect(control.valid).toBe(true);
  });

  it('includes attribution fields when collecting images', () => {
    const create = vi.fn(() => of({ id: 9 }));
    const { form } = setup(create);
    form.form.controls.commonName.setValue('Okapi');
    form.form.controls.otherImageUrl.setValue(
      'https://upload.wikimedia.org/wikipedia/commons/9/9f/Okapia_johnstoni_17zz.jpg',
    );
    form.form.controls.otherImageAttribution.setValue('Charles J. Sharp / CC BY-SA 4.0');
    form.form.controls.otherImageSourcePageUrl.setValue(
      'https://commons.wikimedia.org/wiki/File:Okapia_johnstoni_17zz.jpg',
    );
    form.submit();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [
          expect.objectContaining({
            kind: 'unspecified',
            attribution: 'Charles J. Sharp / CC BY-SA 4.0',
            sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Okapia_johnstoni_17zz.jpg',
          }),
        ],
      }),
    );
  });
});
