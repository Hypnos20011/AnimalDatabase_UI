import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReviewAnimals } from './review-animals';

@Component({
  selector: 'app-review',
  imports: [RouterLink, ReviewAnimals],
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class Review {
  readonly tabs = [{ id: 'animals', label: 'New animals' }] as const;
  activeTab = signal<string>('animals');
}