import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TopSearch } from './animal-model/top-search.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5190/api/searches';

  record(queryText: string, animalId: number): Observable<void> {
    return this.http.post<void>(this.apiUrl, { queryText, animalId });
  }

  getTop(limit = 5): Observable<TopSearch[]> {
    return this.http.get<TopSearch[]>(`${this.apiUrl}/top`, { params: { limit } });
  }
}
