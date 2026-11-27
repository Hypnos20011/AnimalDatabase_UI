import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnimalService } from './animal.service';

export type MissingTranslationCountState = 'locked' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class MissingTranslationCountService {
  private animals = inject(AnimalService);
  private unlocked = false;
  private requestId = 0;
  private request?: Subscription;

  readonly count = signal(0);
  readonly state = signal<MissingTranslationCountState>('locked');

  setUnlocked(unlocked: boolean): void {
    if (this.unlocked === unlocked) return;
    this.unlocked = unlocked;
    if (!unlocked) {
      this.requestId++;
      this.request?.unsubscribe();
      this.count.set(0);
      this.state.set('locked');
      return;
    }
    this.refresh();
  }

  refresh(): void {
    if (!this.unlocked) return;
    const requestId = ++this.requestId;
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.animals.missingTranslations().subscribe({
      next: (rows) => {
        if (this.unlocked && requestId === this.requestId) {
          this.count.set(rows.length);
          this.state.set('ready');
        }
      },
      error: () => {
        if (this.unlocked && requestId === this.requestId) this.state.set('error');
      },
    });
  }
}
