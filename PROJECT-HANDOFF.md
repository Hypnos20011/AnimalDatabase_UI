# Animal Database — Project Handoff

Written 2026-10-22 so a different AI (or a fresh Hermes session) can pick this up
without re-reading a 15-hour conversation.

---

## 1. What the project is

Leo's personal side project. A personal collection of **weird / unusual animals**
(not common ones — Wikipedia already covers tigers in 40 languages). Leo's words:
"its just gonna be my own collection for a while."

Original vision, verbatim from Leo:
- Website with a search function and a filter
- Search by name **or** by characteristics when he can't remember the name
- "Top Searches" panel below, showing most-frequently-searched names
- As you type: suggestions with a name + small matching image
- Click through → detail view with pictures of the animal (male / female / baby)
- Detail view: bullet-point profile, scientific name, family

**Decisions Leo made** (these are his, don't relitigate them):
- C# / ASP.NET Core for the backend (not Java, not NestJS)
- MariaDB for the database
- **Structured filters**, not free-text search
- **UI design last** — "we do the ui design last. thats what we always get told."
- Wikiwand is a trap: use `upload.wikimedia.org` / `thumb.wikimedia.org` direct URLs

---

## 2. ⚠️ IMPORTANT — the code lives on the D: drive, which gets unplugged

All three layers of this project live on `D:`:

| Layer | Path |
|---|---|
| Angular frontend | `D:\AnimalDatabaseProject\` |
| ASP.NET Core API | `D:\AnimalDatabase.Api\` |
| Abandoned Java version | `C:\Users\jas001\Pictures\animal-database-api\` (not on D:) |

**D: is an external drive and it is frequently NOT mounted.** This has already
happened once: on 2026-10-22 morning `Get-PSDrive` returned only `C:`, `J:`, `W:`
and `Test-Path 'D:\'` was `False` — the whole project looked gone. Leo plugged the
drive back in and every file was intact.

**First action for whoever picks this up:** run `Get-PSDrive -PSProvider FileSystem`.
If `D:` is missing, stop and tell Leo to plug in the external drive. Don't start
rebuilding anything — just check the drive first.

The MariaDB database is safe regardless: it lives in
`C:\Program Files\MariaDB*\data` on C:, and the service runs independently of D:.

---

## 3. Current database state

MariaDB 11.8.3, service running, `localhost:3306`, user `root`.
Schema name: **`animaldatabase`**

### Table: `animals` (18 columns, one row per animal)

```sql
CREATE TABLE animals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    common_name        VARCHAR(120)  NOT NULL,
    scientific_name    VARCHAR(150)  NULL,
    family             VARCHAR(120)  NULL,
    taxonomic_class    VARCHAR(40)   NULL,
    is_domesticated    TINYINT(1)    NOT NULL DEFAULT 0,
    size_length_cm_min INT  NULL,
    size_length_cm_max INT  NULL,
    size_height_cm_min INT  NULL,
    size_height_cm_max INT  NULL,
    weight_kg_min      DECIMAL(7,2) NULL,
    weight_kg_max      DECIMAL(7,2) NULL,
    lifespan_years_min INT NULL,
    lifespan_years_max INT NULL,
    iucn_status        VARCHAR(40)   NULL,
    habitat            VARCHAR(255)  NULL,
    range_region       VARCHAR(255)  NULL,
    profile            TEXT          NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Table: `animal_images`

```sql
CREATE TABLE animal_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    animal_id INT NOT NULL,
    kind VARCHAR(20) NOT NULL,
    url VARCHAR(500) NOT NULL,
    caption VARCHAR(200) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (animal_id) REFERENCES animals(id) ON DELETE CASCADE
);
CREATE INDEX idx_animal_images_animal ON animal_images(animal_id);
```

`kind` values: `'male'`, `'female'`, `'baby'`, `'unspecified'`.

### Animals in the database

| id | Name | Scientific name | Class | IUCN |
|---|---|---|---|---|
| 1 | Tiger | Panthera tigris | mammal | endangered |
| 2 | Okapi | Okapia johnstoni | mammal | endangered |
| 3 | Marbled Cat | Pardofelis marmorata | mammal | — |
| 4 | Axolotl | Ambystoma mexicanum | amphibian | critically endangered |
| — | Giant huntsman spider | Heteropoda maxima | **invertebrate** | least concern |
| — | Indian pangolin | Manis crassicaudata | mammal | — |

6 animals. Each has one image row.

**Known data bug to fix when resuming:** the Giant huntsman spider was originally
inserted with `taxonomic_class = 'arachnids'`, which is not a valid value. Leo
already ran the fix:
```sql
UPDATE animals SET taxonomic_class = 'invertebrate' WHERE common_name = 'Giant huntsman spider';
```

**Known data smell:** the Marbled Cat row has `lifespan_years_min = 0`, which is
wrong (should be ~10–12). Not yet fixed.

---

## 4. C# backend — `AnimalDatabase.Api`

ASP.NET Core Web API, .NET 8, controllers style, created with:
```
dotnet new webapi -n AnimalDatabase.Api --use-controllers -f net8.0
```

**NuGet packages (only these 3, don't add EF Core — it fights Dapper):**
- `Dapper`
- `MySqlConnector`
- `Swashbuckle.AspNetCore`

**Port:** `5190` → `http://localhost:5190/api/animals`

**Config:** connection string is in **user-secrets**, NOT in appsettings.json:
```
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:AnimalDatabase" "Server=localhost;Port=3306;Database=animaldatabase;User=root;Password=<...>"
```

### `Program.cs` (this exact version works — do not "improve" it)

```csharp
using AnimalDatabase.Api.Data;
using Dapper;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<AnimalRepository>();

builder.Services.Configure<Microsoft.AspNetCore.Mvc.JsonOptions>(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

var app = builder.Build();

app.UseCors();
app.MapControllers();

app.Run();
```

**Two gotchas that cost real time here:**
1. `Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true` is what makes
   `common_name` → `CommonName` work. Without it every field comes back null.
2. The JSON options namespace is **`Microsoft.AspNetCore.Mvc.JsonOptions`**, not
   `Microsoft.AspNetCore.Http.Json.JsonOptions`. The `Http.Json` one configures
   minimal APIs and controllers ignore it. Also: **no Newtonsoft** — modern
   ASP.NET Core uses System.Text.Json and Newtonsoft types won't resolve.

### `Models/Animal.cs`

```csharp
namespace AnimalDatabase.Api.Models;

public class Animal
{
    public int Id { get; set; }
    public string CommonName { get; set; } = string.Empty;
    public string? ScientificName { get; set; }
    public string? Family { get; set; }
    public string? TaxonomicClass { get; set; }
    public bool IsDomesticated { get; set; }
    public int? SizeLengthCmMin { get; set; }
    public int? SizeLengthCmMax { get; set; }
    public int? SizeHeightCmMin { get; set; }
    public int? SizeHeightCmMax { get; set; }
    public decimal? WeightKgMin { get; set; }
    public decimal? WeightKgMax { get; set; }
    public int? LifespanYearsMin { get; set; }
    public int? LifespanYearsMax { get; set; }
    public string? IucnStatus { get; set; }
    public string? Habitat { get; set; }
    public string? RangeRegion { get; set; }
    public string? Profile { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

### `Models/AnimalImage.cs`

```csharp
namespace AnimalDatabase.Api.Models;

public class AnimalImage
{
    public int Id { get; set; }
    public int AnimalId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### `Data/AnimalRepository.cs`

```csharp
using AnimalDatabase.Api.Models;
using Dapper;
using MySqlConnector;

namespace AnimalDatabase.Api.Data;

public class AnimalRepository
{
    private readonly string _connectionString;

    public AnimalRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("AnimalDatabase")
            ?? throw new InvalidOperationException("Connection string 'AnimalDatabase' not found.");
    }

    public async Task<IReadOnlyList<Animal>> GetAllAsync()
    {
        await using var connection = new MySqlConnection(_connectionString);
        var rows = await connection.QueryAsync<Animal>("SELECT * FROM animals ORDER BY common_name");
        return rows.ToList();
    }

    public async Task<Animal?> GetByIdAsync(int id)
    {
        await using var connection = new MySqlConnection(_connectionString);
        return await connection.QuerySingleOrDefaultAsync<Animal>(
            "SELECT * FROM animals WHERE id = @Id",
            new { Id = id });
    }

    public async Task<IReadOnlyList<AnimalImage>> GetImagesByAnimalIdAsync(int animalId)
    {
        await using var connection = new MySqlConnection(_connectionString);
        var rows = await connection.QueryAsync<AnimalImage>(
            "SELECT * FROM animal_images WHERE animal_id = @AnimalId ORDER BY sort_order, id",
            new { AnimalId = animalId });
        return rows.ToList();
    }
}
```

### `Controllers/AnimalsController.cs`

```csharp
using AnimalDatabase.Api.Data;
using AnimalDatabase.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace AnimalDatabase.Api.Controllers;

[ApiController]
[Route("api/animals")]
public class AnimalsController : ControllerBase
{
    private readonly AnimalRepository _repository;

    public AnimalsController(AnimalRepository repository)
    {
        _repository = repository;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<Animal>>> GetAll()
    {
        var animals = await _repository.GetAllAsync();
        return Ok(animals);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Animal>> GetById(int id)
    {
        var animal = await _repository.GetByIdAsync(id);
        if (animal is null)
        {
            return NotFound();
        }
        return Ok(animal);
    }

    [HttpGet("{id:int}/images")]
    public async Task<ActionResult<IReadOnlyList<AnimalImage>>> GetImages(int id)
    {
        var images = await _repository.GetImagesByAnimalIdAsync(id);
        return Ok(images);
    }
}
```

**Endpoints that exist and work:**
- `GET /api/animals`
- `GET /api/animals/{id}`
- `GET /api/animals/{id}/images`

---

## 5. Angular frontend — `AnimalDatabaseProject`

**Angular 22.2.** This matters a lot — the file-naming conventions changed and
this is where most time was lost:

| Old (≤19) | Angular 22 |
|---|---|
| `app.component.ts` | `app.ts` |
| `animals-list.component.ts` | `animals-list.ts` |
| `app.component.html` | `app.html` |
| inline `template:` / `styles:` | `templateUrl:` / `styleUrl:` |
| `*ngIf` / `*ngFor` | `@if` / `@for ... track` |
| `standalone: true` required | standalone by default, don't write it |
| plain properties | signals (`signal()`, `computed()`) |

**Port:** `4200` → `http://localhost:4200`
**Editor:** WebStorm

### File tree as it stood

```
src/app/
  animal.model.ts
  animal-image.model.ts
  animal.service.ts
  animals-list/
    animals-list.ts
    animals-list.html
    animals-list.css
  animal-detail/
    animal-detail.ts
    animal-detail.html
    animal-detail.css
  app.ts
  app.html
  app.css
  app.config.ts
  app.routes.ts
  app.spec.ts
  index.html
  main.ts
  styles.css
```

Note: `animals-list/` and `animal-detail/` are **folders** with three files each,
not flat files. Imports are relative across them: `'../animal-detail/animal-detail'`.

### `animal.model.ts`

```typescript
export interface Animal {
  id: number;
  commonName: string;
  scientificName: string | null;
  family: string | null;
  taxonomicClass: string | null;
  isDomesticated: boolean;
  sizeLengthCmMin: number | null;
  sizeLengthCmMax: number | null;
  sizeHeightCmMin: number | null;
  sizeHeightCmMax: number | null;
  weightKgMin: number | null;
  weightKgMax: number | null;
  lifespanYearsMin: number | null;
  lifespanYearsMax: number | null;
  iucnStatus: string | null;
  habitat: string | null;
  rangeRegion: string | null;
  profile: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### `animal-image.model.ts`

```typescript
export interface AnimalImage {
  id: number;
  animalId: number;
  kind: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}
```

### `animal.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Animal } from './animal.model';
import { AnimalImage } from './animal-image.model';

@Injectable({ providedIn: 'root' })
export class AnimalService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5190/api/animals';

  getAll(): Observable<Animal[]> {
    return this.http.get<Animal[]>(this.apiUrl);
  }

  getById(id: number): Observable<Animal> {
    return this.http.get<Animal>(`${this.apiUrl}/${id}`);
  }

  getImages(animalId: number): Observable<AnimalImage[]> {
    return this.http.get<AnimalImage[]>(`${this.apiUrl}/${animalId}/images`);
  }
}
```

### `app.config.ts`

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient()
  ]
};
```

`provideHttpClient()` is mandatory — without it the `HttpClient` in
`animal.service.ts` doesn't inject.

### `app.ts` / `app.html`

```typescript
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnimalsList } from './animals-list/animals-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AnimalsList],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Animal Database');
}
```

```html
<h1>{{ title() }}</h1>
<app-animals-list></app-animals-list>
```

No `<router-outlet />` currently — `app.routes.ts` is empty.

### `animals-list.ts` (last known good state)

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimalDetail } from '../animal-detail/animal-detail';
import { AnimalService } from '../animal.service';
import { Animal } from '../animal-model/animal.model';

type FilterType = 'all' | 'wild';

@Component({
  selector: 'app-animals-list',
  imports: [CommonModule, AnimalDetail],
  templateUrl: './animals-list.html',
  styleUrl: './animals-list.css',
})
export class AnimalsList {
  private animalService = inject(AnimalService);

  animals = signal<Animal[]>([]);
  loading = signal(true);
  error = signal('');

  query = signal('');
  selectedClasses = signal<Set<string>>(new Set());
  selectedStatuses = signal<Set<string>>(new Set());
  filterType = signal<FilterType>('all');

  selectedAnimal = signal<Animal | null>(null);

  suggestions = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length < 2) return [];

    return this.animals()
      .filter((animal) => {
        const name = animal.commonName.toLowerCase();
        const sci = (animal.scientificName ?? '').toLowerCase();
        return name.includes(q) || sci.includes(q);
      })
      .slice(0, 8);
  });

  availableClasses = computed(() => {
    const set = new Set<string>();
    for (const a of this.animals()) {
      if (a.taxonomicClass) set.add(a.taxonomicClass);
    }
    return Array.from(set).sort();
  });

  availableStatuses = computed(() => {
    const set = new Set<string>();
    for (const a of this.animals()) {
      if (a.iucnStatus) set.add(a.iucnStatus);
    }
    return Array.from(set).sort();
  });

  showDomesticated = computed(() => this.filterType() === 'all');

  filteredAnimals = computed(() => {
    const q = this.query().trim().toLowerCase();
    const classes = this.selectedClasses();
    const statuses = this.selectedStatuses();
    const type = this.filterType();

    return this.animals().filter((animal) => {
      if (q) {
        const haystack = [animal.commonName, animal.scientificName ?? '', animal.profile ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (classes.size > 0 && animal.taxonomicClass && !classes.has(animal.taxonomicClass)) {
        return false;
      }

      if (statuses.size > 0 && animal.iucnStatus && !statuses.has(animal.iucnStatus)) {
        return false;
      }

      return !(type === 'wild' && animal.isDomesticated);
    });
  });

  constructor() {
    this.animalService.getAll().subscribe({
      next: (data) => {
        this.animals.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Could not load animals');
        this.loading.set(false);
      },
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
  }

  isClassActive(cls: string): boolean {
    return this.selectedClasses().has(cls);
  }

  toggleClass(cls: string): void {
    const next = new Set(this.selectedClasses());
    if (next.has(cls)) next.delete(cls);
    else next.add(cls);
    this.selectedClasses.set(next);
  }

  isStatusActive(status: string): boolean {
    return this.selectedStatuses().has(status);
  }

  toggleStatus(status: string): void {
    const next = new Set(this.selectedStatuses());
    if (next.has(status)) next.delete(status);
    else next.add(status);
    this.selectedStatuses.set(next);
  }

  toggleType(): void {
    this.filterType.update((current) => (current === 'all' ? 'wild' : 'all'));
  }

  getThumbnail(animal: Animal): string | null {
    void animal;
    return null;
  }

  selectAnimal(animal: Animal): void {
    this.selectedAnimal.set(animal);
  }

  closeDetail(): void {
    this.selectedAnimal.set(null);
  }
}
```

**Open question left dangling:** the filter chips (`.filter-chips`, `.chip`,
`.chip.active` CSS exists in `animals-list.css`) are **no longer in the HTML**.
The signals `selectedClasses` / `selectedStatuses` / `filterType` are still there
and working, just not rendered. Leo was asked whether that's intentional and never
answered. Decide with him before touching it.

### `animal-detail.ts`

```typescript
import { Component, EventEmitter, Output, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Animal } from '../animal-model/animal.model';
import { AnimalImage } from '../animal-image.model';
import { AnimalService } from '../animal.service';

@Component({
  selector: 'app-animal-detail',
  imports: [CommonModule],
  templateUrl: './animal-detail.html',
  styleUrl: './animal-detail.css'
})
export class AnimalDetail implements OnInit {
  animal = input<Animal | null>(null);
  @Output() close = new EventEmitter<void>();

  private animalService = inject(AnimalService);

  images = signal<AnimalImage[]>([]);
  imagesLoading = signal(true);

  ngOnInit(): void {
    const current = this.animal();
    if (current) {
      this.loadImages(current.id);
    }
  }

  loadImages(animalId: number): void {
    this.animalService.getImages(animalId).subscribe({
      next: (data) => {
        this.images.set(data);
        this.imagesLoading.set(false);
      },
      error: () => {
        this.images.set([]);
        this.imagesLoading.set(false);
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
```

---

## 6. What's done, what's not

### ✅ Working end to end

- MariaDB schema clean, 6 animals inserted, images attached
- API returning real JSON at `http://localhost:5190`
- Angular at `http://localhost:4200` rendering the list from the DB
- Detail view opening on click, showing image + `<dl>` metadata + profile
- Structured filter chips working (class, IUCN status, wild/domesticated)
- Search box filtering the list
- Search suggestion dropdown appearing at 2+ chars

### ❌ Not built yet

1. **Thumbnails in the suggestion dropdown** — `getThumbnail()` returns `null` by
   design. Needs the API to return images nested inside each animal (a join), or
   a parallel per-animal image fetch. Leo decided to skip for now.
2. **Top Searches panel** — the schema was designed but never created:
   ```sql
   CREATE TABLE searches (
       id INT PRIMARY KEY AUTO_INCREMENT,
       query_text VARCHAR(255) NOT NULL,
       animal_id INT NULL,
       searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       INDEX idx_searches_searched_at (searched_at)
   );
   ```
   plus a `POST /api/searches` endpoint and an 800ms debounce in Angular.
3. **Add Animal UI** — Leo asked for this explicitly as feature #2. He never picked
   the shape (inline form / separate route `/animals/new` / modal). **Ask him.**
4. **Persistent detail URL** — detail view is overlay state, no route. No back-button.
5. **UI polish** — Leo explicitly deferred this. Don't do it unprompted.

---

## 7. How Leo wants to work

This part matters as much as the code.

- **One step at a time.** Verbatim: *"you tell me what i am doing and i do it and
  ask if i have questions and just like a manual only one step at time"*
- **No comments in code he pastes.** Verbatim: *"remember to not do any comments in
  the code i pase"*
- **One file at a time.** The 100-line multi-file dumps broke him. Give each file
  individually and label it clearly: "this is the new file" vs "this is the line
  to add."
- **Let him write the SQL, then review it.** He asked for this explicitly after
  being offered a paste-the-block shortcut. The mechanics he needs reminded of:
  - text → `column 'value',`
  - numbers → `column 123,`
  - unknown → `column NULL,`
  - last row → no trailing comma, then `');`
- **Data + business logic first, UI last.**
- **Code = pseudocode unless he asks for actual Java/C#** — that's for school. This
  project is real code, real languages.

---

## 8. Working with Wikimedia image URLs

Took three attempts before Leo got URLs that worked. Recording it so nobody
repeats the fight.

**Wrong — these all break `<img src>`:**
- `img.wikiwand.com/...` — Wikiwand mirror, can block hotlinking
- `www.wikiwand.com/en/Tiger#/media/File:...` — that's an HTML page with a hash
  fragment, not an image. The browser fetches HTML and shows a broken icon.
- `en.wikipedia.org/wiki/File:...` — file *description* page, not the file
- Any URL with `?utm_source=...&utm_campaign=...` appended — strip it

**Right — direct CDN URLs, both hosts work:**
```
https://upload.wikimedia.org/wikipedia/commons/thumb/<md5>/<File>.jpg/800px-<File>.jpg
https://thumb.wikimedia.org/wikipedia/commons/thumb/<md5>/<File>.jpg/800px-<File>.jpg
```

**How Leo got them:** right-click the image on Wikipedia → "Copy image address"
(NOT "Copy image" — that puts pixel data on the clipboard). Test by pasting into a
new tab: if you see only a photo, you have the right URL.

**The 6 URLs currently in the database:**
```
Tiger (female):  https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Bengal_tiger_(Panthera_tigris_tigris)_female_3_crop.jpg/500px-Bengal_tiger_(Panthera_tigris_tigris)_female_3_crop.jpg
Okapi:           https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Okapia_johnstoni_17zz.jpg/250px-Okapia_johnstoni_17zz.jpg
Marbled cat:     https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Marbled_cat_borneo.jpg/250px-Marbled_cat_borneo.jpg
Axolotl:         https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Axolotl_BU.jpg/330px-Axolotl_BU.jpg
Pangolin:        https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Different_pangolins_Featured_image.jpg/500px-Different_pangolins_Featured_image.jpg
```

---

## 9. Unrelated but adjacent

An abandoned **Java/Spring Boot** version of the same project exists at
`C:\Users\jas001\Pictures\animal-database-api\`. Gradle, Flyway migrations,
remote = `https://github.com/Hypnos20011/AnimalDatabase.git`, one commit
("Initial commit: entities, repositories, Flyway migrations"). Leo dumped this and
started fresh with C# + Angular. Don't touch it unless he asks.

---

## 10. Resuming — suggested first moves

1. Check `Get-PSDrive -PSProvider FileSystem`. If `D:` is there, open both projects
   in Rider and WebStorm, hit play on both servers, open `http://localhost:4200`.
   That's a 2-minute verification and everything works. (Verified working state
   on 2026-10-22: all 8 Angular source files and all 4 C# source files present and
   byte-identical to the code in §4/§5.)
2. Before writing any new feature, ask Leo the two open questions:
   - Are the filter chips coming back or are they dead code?
   - What shape should Add Animal UI be?