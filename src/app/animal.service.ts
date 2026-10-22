import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Animal, NewAnimal } from './animal-model/animal.model';
import { AnimalImage } from './animal-model/animal-image.model';
import { WikipediaImport } from './animal-model/wikipedia-import.model';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnimalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/animals`;

  getAll(): Observable<Animal[]> {
    return this.http.get<Animal[]>(this.apiUrl);
  }

  getById(id: number): Observable<Animal> {
    return this.http.get<Animal>(`${this.apiUrl}/${id}`);
  }

  getImages(animalId: number): Observable<AnimalImage[]> {
    return this.http.get<AnimalImage[]>(`${this.apiUrl}/${animalId}/images`);
  }

  create(animal: NewAnimal): Observable<Animal> {
    return this.http.post<Animal>(this.apiUrl, animal);
  }

  update(id: number, animal: NewAnimal): Observable<Animal> {
    return this.http.put<Animal>(`${this.apiUrl}/${id}`, animal);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  importFromWikipedia(query: string): Observable<WikipediaImport> {
    return this.http.get<WikipediaImport>(`${environment.apiUrl}/wikipedia/import`, {
      params: { q: query },
    });
  }
}
