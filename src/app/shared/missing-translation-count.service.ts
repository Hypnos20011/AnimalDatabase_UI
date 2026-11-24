import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AnimalService } from './animal.service';

@Injectable({ providedIn: 'root' })
export class MissingTranslationCountService {
  private animals = inject(AnimalService);
  private unlocked = false;
  private requestId = 0;
  private request?: Subscription;

  readonly count = signal(0);

  setUnlocked(unlocked: boolean): void {
    if (this.unlocked === unlocked) return;
    this.unlocked = unlocked;
    if (!unlocked) {
      this.requestId++;
      this.request?.unsubscribe();
      this.count.set(0);
      return;
    }
    this.refresh();
  }

  refresh(): void {
    if (!this.unlocked) return;
    const requestId = ++this.requestId;
    this.request?.unsubscribe();
    this.request = this.animals.missingTranslations().subscribe({
      next: (rows) => {
        if (this.unlocked && requestId === this.requestId) this.count.set(rows.length);
      },
      error: () => {
        if (this.unlocked && requestId === this.requestId) this.count.set(0);
      },
    });
  }
}
