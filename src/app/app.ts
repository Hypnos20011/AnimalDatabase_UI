import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RandomAnimalService } from './shared/random-animal.service';
import { AdminKeyService } from './admin/admin-key.service';
import { LanguageService } from './shared/i18n/language.service';
import { SUPPORTED_LANGUAGES } from './shared/i18n/languages';
import { UpperCasePipe } from '@angular/common';
import { CompareService } from './compare/compare.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive,UpperCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private random = inject(RandomAnimalService);
  protected admin = inject(AdminKeyService);
  protected i18n = inject(LanguageService);
  protected compare = inject(CompareService);
  protected readonly languages = SUPPORTED_LANGUAGES;
  protected readonly title = signal('Unusual Animals');

  openRandom(): void {
    this.random.open();
  }

  lock(): void {
    this.admin.clear();
  }
}
