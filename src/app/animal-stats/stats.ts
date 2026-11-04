import { Component, inject, signal } from '@angular/core';
import { StatsService } from './stats.service';
import { AnimalStats } from '../animal-model/animal-stats.model';
import { KeyValuePipe } from '@angular/common';
import { LanguageService } from '../shared/i18n/language.service';

@Component({
  imports: [KeyValuePipe],
  selector: 'app-stats',
  styleUrl: './stats.css',
  templateUrl: './stats.html',
})
export class Stats {
  private statsService = inject(StatsService);
  protected i18n = inject(LanguageService);
  stats = signal<AnimalStats | undefined>(undefined);

  constructor() {
    this.statsService.getStats().subscribe((stats) => this.stats.set(stats));
  }
}
