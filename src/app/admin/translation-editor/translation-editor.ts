import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, of, Subscription, throwError } from 'rxjs';
import { AnimalTexts } from '../../animal-model/animal.model';
import { AnimalService } from '../../shared/animal.service';
import { LanguageService } from '../../shared/i18n/language.service';
import { MissingTranslationCountService } from '../../shared/missing-translation-count.service';

let nextId = 0;

@Component({
  selector: 'app-translation-editor',
  imports: [ReactiveFormsModule],
  styleUrl: './translation-editor.css',
  templateUrl: './translation-editor.html',
})
export class TranslationEditor {
  private fb = inject(FormBuilder);
  private animals = inject(AnimalService);
  private translationCount = inject(MissingTranslationCountService);
  protected i18n = inject(LanguageService);

  error = signal('');
  loading = signal(false);
  saving = signal(false);
  form: TranslationFormGroup = this.fb.group({
    de: this.createTextsGroup(),
    fr: this.createTextsGroup(),
  });

  animalId = input<number | null>(null);
  animalName = input('');

  closed = output<void>();
  saved = output<void>();

  readonly titleId = `translation-editor-title-${nextId++}`;

  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private saveRequest?: Subscription;

  constructor() {
    effect((onCleanup) => {
      const id = this.animalId();
      const dialog = this.dialog().nativeElement;
      if (id !== null) {
        if (!dialog.open) dialog.showModal();
        const subscription = this.load(id);
        onCleanup(() => {
          subscription.unsubscribe();
          this.saveRequest?.unsubscribe();
        });
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  cancel(): void {
    this.closed.emit();
  }

  onNativeCancel(event: Event): void {
    event.preventDefault();
    this.cancel();
  }

  save(): void {
    const id = this.animalId();
    if (id === null || this.loading() || this.saving()) return;

    const value = this.form.getRawValue();
    this.error.set('');
    this.saving.set(true);
    this.saveRequest = forkJoin({
      de: this.animals.saveTranslation(id, 'de', this.normalizeTexts(value.de)),
      fr: this.animals.saveTranslation(id, 'fr', this.normalizeTexts(value.fr)),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.translationCount.refresh();
        this.error.set(
          this.i18n.t(
            error instanceof HttpErrorResponse && error.status === 403
              ? 'admin.accessDenied'
              : 'admin.missing.saveError',
          ),
        );
      },
    });
  }

  private createTextsGroup(): TranslationTextsGroup {
    return this.fb.group({
      commonName: [''],
      habitat: [''],
      rangeRegion: [''],
      profile: [''],
    });
  }

  private load(id: number): Subscription {
    this.error.set('');
    this.loading.set(true);
    this.saving.set(false);
    this.form.reset();
    const translation = (language: 'de' | 'fr') =>
      this.animals
        .getTranslation(id, language)
        .pipe(catchError((err) => (err.status === 404 ? of(emptyTexts) : throwError(() => err))));

    return forkJoin({ de: translation('de'), fr: translation('fr') }).subscribe({
      next: ({ de, fr }) => {
        this.form.patchValue({ de, fr });
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.form.reset();
        this.error.set(
          untracked(() =>
            this.i18n.t(
              error instanceof HttpErrorResponse && error.status === 403
                ? 'admin.accessDenied'
                : 'admin.missing.error',
            ),
          ),
        );
        this.loading.set(false);
      },
    });
  }

  private normalizeTexts(texts: AnimalTexts): AnimalTexts {
    return {
      commonName: this.text(texts.commonName),
      habitat: this.text(texts.habitat),
      rangeRegion: this.text(texts.rangeRegion),
      profile: this.text(texts.profile),
    };
  }

  private text(value: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed || null;
  }
}

const emptyTexts: AnimalTexts = {
  commonName: null,
  habitat: null,
  rangeRegion: null,
  profile: null,
};

type TranslationTextsGroup = FormGroup<{
  commonName: FormControl<string | null>;
  habitat: FormControl<string | null>;
  rangeRegion: FormControl<string | null>;
  profile: FormControl<string | null>;
}>;

type TranslationFormGroup = FormGroup<{
  de: TranslationTextsGroup;
  fr: TranslationTextsGroup;
}>;
