import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RandomAnimalService } from './shared/random-animal.service';
import { AdminKeyService } from './admin/admin-key.service';
import { LanguageService } from './shared/i18n/language.service';
import { Language, SUPPORTED_LANGUAGES } from './shared/i18n/languages';
import { TranslationKey } from './shared/i18n/en';
import { CompareService } from './compare/compare.service';
import { MissingTranslationCountService } from './shared/missing-translation-count.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class App {
  private random = inject(RandomAnimalService);
  private injector = inject(Injector);
  protected admin = inject(AdminKeyService);
  protected i18n = inject(LanguageService);
  protected compare = inject(CompareService);
  protected translationCount = inject(MissingTranslationCountService);
  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly title = signal('Unusual Animals');
  protected languageOpen = signal(false);
  private languageRoot = viewChild<ElementRef<HTMLElement>>('languageRoot');
  private languageButton = viewChild<ElementRef<HTMLButtonElement>>('languageButton');
  private languageItems = viewChildren<ElementRef<HTMLButtonElement>>('languageItem');
  protected languageLabel = computed(() =>
    this.i18n.t('language.current', { name: this.languageName(this.i18n.language()) }),
  );

  constructor() {
    effect(() => this.translationCount.setUnlocked(this.admin.role() === 'admin'));
  }

  openRandom(): void {
    this.random.open();
  }

  lock(): void {
    this.admin.lock();
  }

  languageCode(): string {
    return this.i18n.language().toUpperCase();
  }

  languageName(lang: Language): string {
    return this.i18n.t(`language.${lang}` as TranslationKey);
  }

  toggleLanguageMenu(): void {
    const open = !this.languageOpen();
    this.languageOpen.set(open);
    if (open) this.focusLanguage(this.i18n.language());
  }

  chooseLanguage(lang: Language): void {
    this.i18n.setLanguage(lang);
    this.languageOpen.set(false);
    this.languageButton()?.nativeElement.focus();
  }

  onLanguageButtonKey(event: KeyboardEvent): void {
    if (this.languageOpen()) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.languageOpen.set(true);
    this.focusLanguage(event.key === 'ArrowUp' ? 'fr' : this.i18n.language());
  }

  onLanguageMenuKey(event: KeyboardEvent): void {
    const items = this.languageItems().map((item) => item.nativeElement);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (event.key === 'Escape') {
      this.closeLanguageMenu();
    }
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.languageOpen()) return;
    const root = this.languageRoot()?.nativeElement;
    if (event.target instanceof Node && root?.contains(event.target)) return;
    this.languageOpen.set(false);
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.languageOpen() || event.key !== 'Escape') return;
    this.closeLanguageMenu();
  }

  private closeLanguageMenu(): void {
    this.languageOpen.set(false);
    this.languageButton()?.nativeElement.focus();
  }

  private focusLanguage(lang: Language): void {
    afterNextRender(
      () => {
        const items = this.languageItems();
        const match = items.find((item) => item.nativeElement.dataset['code'] === lang);
        (match ?? items[0])?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }
}
