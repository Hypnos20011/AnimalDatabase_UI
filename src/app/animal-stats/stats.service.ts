import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { AnimalStats } from '../animal-model/animal-stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/stats`;

  getStats(): Observable<AnimalStats> {
    return this.http.get<AnimalStats>(`${this.apiUrl}`);
  }
}
