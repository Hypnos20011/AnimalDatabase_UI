import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TopSearch } from '../animal-model/top-search.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/searches`;

  record(queryText: string, animalId: number): Observable<void> {
    return this.http.post<void>(this.apiUrl, { queryText, animalId });
  }

  getTop(limit = 5, days = 30): Observable<TopSearch[]> {
    return this.http.get<TopSearch[]>(`${this.apiUrl}/top`, { params: { limit, days } });
  }
}
