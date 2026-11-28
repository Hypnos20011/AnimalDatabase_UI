import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AnimalForm } from './animal-form';
import { AnimalService } from '../shared/animal.service';
import { Animal } from '../animal-model/animal.model';

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
    form.form.patchValue({ weightMin: 10, weightMax: 5 });
    form.submit();
    fixture.detectChanges();
    expect(create).not.toHaveBeenCalled();
    expect(form.rangeReversed('weightMin')).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Enter a valid range; the minimum must not exceed the maximum.',
    );
  });

  it('accepts equal values and a missing side', () => {
    const { form } = setup();
    form.form.patchValue({ weightMin: 5, weightMax: 5, lifespanMin: 3 });
    expect(form.form.valid).toBe(true);
  });

  it('accepts a blue whale but not a weight over the limit', () => {
    const { form } = setup();
    form.form.controls.weightMax.setValue(136000);
    expect(form.form.valid).toBe(true);
    form.form.controls.weightMax.setValue(10000000);
    expect(form.form.valid).toBe(false);
  });

  it('accepts fractional years for the lifespan', () => {
    const { form } = setup();
    form.form.controls.lifespanMax.setValue(2.5);
    expect(form.form.valid).toBe(true);
  });

  it('rejects positive values that round to zero and accepts values that round away from zero', () => {
    const { fixture, form, create } = setup();
    const weightMin = form.form.controls.weightMin;
    weightMin.setValue(0.0000004);
    form.submit();
    fixture.detectChanges();

    expect(weightMin.hasError('tooSmallToStore')).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Too small to store; use a smaller unit.',
    );

    weightMin.setValue(null);
    form.form.controls.weightUnit.setValue('g');
    form.changeUnit('weight');
    weightMin.setValue(0.0005);
    expect(weightMin.valid).toBe(true);
    form.submit();

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ weightGramsMin: 0.001 }));
  });

  it('accepts the exact lifespan limit in years and rejects a larger value', () => {
    const { form } = setup();
    form.form.controls.lifespanMax.setValue(8333.325);
    expect(form.form.controls.lifespanMax.valid).toBe(true);
    form.form.controls.lifespanMax.setValue(8333.3251);
    expect(form.form.controls.lifespanMax.invalid).toBe(true);
  });

  it.each([
    { unit: 'g' as const, value: 2 },
    { unit: 'kg' as const, value: 0.002 },
  ])('saves $value $unit as 2 grams', ({ unit, value }) => {
    const { form, create } = setup();
    form.form.controls.weightUnit.setValue(unit);
    form.changeUnit('weight');
    form.form.controls.weightMin.setValue(value);
    form.form.controls.weightMax.setValue(value);
    form.submit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      weightGramsMin: 2,
      weightGramsMax: 2,
    }));
  });

  it('converts displayed ranges when units change and saves canonical values', () => {
    const { fixture, form, create } = setup();
    form.form.patchValue({
      lengthMin: 125, lengthMax: 250,
      heightMin: 50, heightMax: 80,
      weightMin: 0.002, weightMax: 0.005,
      lifespanMin: 1.5, lifespanMax: 2,
    });
    const selectUnit = (name: string, value: string) => {
      const select = fixture.nativeElement.querySelector(`select[formControlName="${name}"]`) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(new Event('change'));
    };
    selectUnit('lengthUnit', 'm');
    selectUnit('heightUnit', 'mm');
    selectUnit('weightUnit', 'g');
    selectUnit('lifespanUnit', 'month');
    expect(form.form.getRawValue()).toEqual(expect.objectContaining({
      lengthMin: 1.25, lengthMax: 2.5,
      heightMin: 500, heightMax: 800,
      weightMin: 2, weightMax: 5,
      lifespanMin: 18, lifespanMax: 24,
    }));
    form.submit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      lengthMmMin: 1250, lengthMmMax: 2500,
      heightMmMin: 500, heightMmMax: 800,
      weightGramsMin: 2, weightGramsMax: 5,
      lifespanMonthsMin: 18, lifespanMonthsMax: 24,
    }));
  });

  it('preserves empty endpoints across a unit change', () => {
    const { form, create } = setup();
    form.form.controls.lengthMax.setValue(250);
    form.form.controls.lengthUnit.setValue('m');
    form.changeUnit('length');
    expect(form.form.controls.lengthMin.value).toBeNull();
    expect(form.form.controls.lengthMax.value).toBe(2.5);
    form.submit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ lengthMmMin: null, lengthMmMax: 2500 }));
  });

  it.each([
    { min: 'lengthMin' as const, max: 'lengthMax' as const, unit: 'lengthUnit' as const, kind: 'length' as const, displayUnit: 'mm' as const, limit: 9999999.99 },
    { min: 'heightMin' as const, max: 'heightMax' as const, unit: 'heightUnit' as const, kind: 'height' as const, displayUnit: 'mm' as const, limit: 9999999.99 },
    { min: 'weightMin' as const, max: 'weightMax' as const, unit: 'weightUnit' as const, kind: 'weight' as const, displayUnit: 'g' as const, limit: 9999999999.999 },
    { min: 'lifespanMin' as const, max: 'lifespanMax' as const, unit: 'lifespanUnit' as const, kind: 'lifespan' as const, displayUnit: 'month' as const, limit: 99999.9 },
  ])('enforces non-negative $kind limits in canonical units', ({ min, max, unit, kind, displayUnit, limit }) => {
    const { form, create } = setup();
    form.form.controls[unit].setValue(displayUnit);
    form.changeUnit(kind);
    for (const key of [min, max]) {
      const control = form.form.controls[key];
      control.setValue(-1);
      expect(control.invalid).toBe(true);
      control.setValue(0);
      expect(control.valid).toBe(true);
      control.setValue(limit);
      expect(control.valid).toBe(true);
      control.setValue(limit + 1);
      expect(control.invalid).toBe(true);
      form.submit();
      expect(create).not.toHaveBeenCalled();
      control.setValue(null);
    }
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
      error: { errors: { WeightGramsMin: ["Weight: the minimum can't be larger than the maximum."] } },
    });
    const { form } = setup(vi.fn(() => throwError(() => error)));
    form.submit();
    expect(form.error()).toBe("Weight: the minimum can't be larger than the maximum.");
  });

  it('accepts https image source pages and rejects anything else', () => {
    const { form } = setup();
    const control = form.imageRows.at(0).get('sourcePageUrl')!;
    for (const bad of ['http://commons.wikimedia.org/wiki/File:X.jpg', 'javascript:alert(1)', 'commons']) {
      control.setValue(bad);
      expect(control.invalid).toBe(true);
    }
    control.setValue('https://commons.wikimedia.org/wiki/File:Okapia_johnstoni_17zz.jpg');
    expect(control.valid).toBe(true);
    control.setValue('');
    expect(control.valid).toBe(true);
  });

  it('only accepts https image URLs', () => {
    const { form } = setup();
    const control = form.imageRows.at(0).get('url')!;

    control.setValue('http://upload.wikimedia.org/image.jpg');
    expect(control.invalid).toBe(true);
    control.setValue('https://upload.wikimedia.org/image.jpg');
    expect(control.valid).toBe(true);
  });

  it('includes attribution fields when collecting images', () => {
    const create = vi.fn(() => of({ id: 9 }));
    const { form } = setup(create);
    form.form.controls.commonName.setValue('Okapi');
    const image = form.imageRows.at(0);
    image.get('url')!.setValue(
      'https://upload.wikimedia.org/wikipedia/commons/9/9f/Okapia_johnstoni_17zz.jpg',
    );
    image.get('attribution')!.setValue('Charles J. Sharp / CC BY-SA 4.0');
    image.get('sourcePageUrl')!.setValue(
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

describe('AnimalForm canonical edit', () => {
  it('loads 2500 mm as 2.5 m and saves canonical measurements unchanged', () => {
    const animal = {
      id: 1, commonName: 'Okapi', isDomesticated: false,
      lengthMmMin: 2500, lengthMmMax: null,
      heightMmMin: 500, heightMmMax: 800,
      weightGramsMin: 2, weightGramsMax: 5,
      lifespanMonthsMin: 18, lifespanMonthsMax: 30,
    } as Animal;
    const update = vi.fn(() => of(animal));
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: {
          getAll: vi.fn(() => of([])),
          getById: vi.fn(() => of(animal)),
          getImages: vi.fn(() => of([])),
          update,
        } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    const form = fixture.componentInstance;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(form.form.getRawValue()).toEqual(expect.objectContaining({
      lengthMin: 2.5, lengthMax: null, lengthUnit: 'm',
      heightMin: 50, heightMax: 80, heightUnit: 'cm',
      weightMin: 2, weightMax: 5, weightUnit: 'g',
      lifespanMin: 1.5, lifespanMax: 2.5, lifespanUnit: 'year',
    }));
    form.form.controls.lengthUnit.setValue('mm');
    form.changeUnit('length');
    expect(form.form.controls.lengthMin.value).toBe(2500);
    expect(form.form.controls.lengthMax.value).toBeNull();
    form.submit();
    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({
      lengthMmMin: 2500, lengthMmMax: null,
      heightMmMin: 500, heightMmMax: 800,
      weightGramsMin: 2, weightGramsMax: 5,
      lifespanMonthsMin: 18, lifespanMonthsMax: 30,
    }));
  });

  it('loads 25 months as months and rounds populated inputs to ten significant digits', () => {
    const animal = {
      id: 1,
      commonName: 'Okapi',
      isDomesticated: false,
      lengthMmMin: 12345.67890123,
      lengthMmMax: 25000.12345678,
      heightMmMin: 2345.67890123,
      heightMmMax: null,
      weightGramsMin: 12345.67890123,
      weightGramsMax: 20000.1234567,
      lifespanMonthsMin: 25,
      lifespanMonthsMax: null,
    } as Animal;
    TestBed.configureTestingModule({
      imports: [AnimalForm],
      providers: [
        provideRouter([]),
        { provide: AnimalService, useValue: {
          getAll: vi.fn(() => of([])),
          getById: vi.fn(() => of(animal)),
          getImages: vi.fn(() => of([])),
        } },
      ],
    });
    const fixture = TestBed.createComponent(AnimalForm);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();
    const form = fixture.componentInstance;

    expect(form.form.controls.lifespanUnit.value).toBe('month');
    expect(form.form.controls.lifespanMin.value).toBe(25);
    expect(form.form.controls.lengthMin.value).toBe(12.3456789);
    for (const control of Object.values(form.form.controls)) {
      if (typeof control.value === 'number') {
        expect(Number(control.value.toPrecision(10))).toBe(control.value);
      }
    }
  });
});
