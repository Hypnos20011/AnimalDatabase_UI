import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RandomAnimalService } from './random-animal.service';
import { AdminKeyService } from './admin/admin-key.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private random = inject(RandomAnimalService);
  protected admin = inject(AdminKeyService);
  protected readonly title = signal('Animal Database');

  openRandom(): void {
    this.random.open();
  }

  lock(): void {
    this.admin.clear();
  }
}
