import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminKeyService } from './admin-key.service';
import { LanguageService } from '../shared/i18n/language.service';
import { isRateLimited, rateLimitMessage } from '../shared/rate-limit';
import { MissingTranslationCountService } from '../shared/missing-translation-count.service';

@Component({
  selector: 'app-admin-unlock',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-unlock.html',
  styleUrl: './admin-unlock.css',
})
export class AdminUnlock {
  returnUrl = input<string>();

  protected admin = inject(AdminKeyService);
  protected i18n = inject(LanguageService);
  protected translationCount = inject(MissingTranslationCountService);
  private router = inject(Router);

  key = signal('');
  checking = signal(false);
  error = signal('');

  unlock(): void {
    const key = this.key().trim();
    if (!key || this.checking()) return;
    this.checking.set(true);
    this.error.set('');
    this.admin.verify(key).subscribe({
      next: (valid) => {
        this.checking.set(false);
        if (!valid) {
          this.error.set("That key doesn't match. Check it and try again.");
          return;
        }
        this.admin.set(key, valid);
        this.key.set('');
        this.router.navigateByUrl(this.safeReturnUrl());
      },
      error: (err: unknown) => {
        this.checking.set(false);
        this.error.set(
          isRateLimited(err)
            ? rateLimitMessage(err, 'attempts')
            : "Couldn't reach the server to check the key. Try again in a moment.",
        );
      },
    });
  }

  lock(): void {
    this.admin.lock();
  }

  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/admin')
      ? url
      : '/';
  }
}
