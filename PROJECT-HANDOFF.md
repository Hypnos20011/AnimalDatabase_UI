# Animal Database: Project Handoff

Notes so Leo, or another AI assistant, can pick this project up without re-reading old
conversations. Last updated 2026-10-23, checked against the code in both repos.

---

## 1. What the project is

Leo's personal side project: a personal collection of **weird / unusual animals** (not common
ones; Wikipedia already covers tigers in 40 languages). Leo's words: "its just gonna be my own
collection for a while."

Original vision, from Leo:

- Website with a search function and a filter
- Search by name **or** by characteristics when he can't remember the name
- "Top Searches" panel showing the most frequently searched animals
- Suggestions while typing, with a name and a small matching image
- Click through to a detail view with pictures of the animal (male / female / baby)
- Detail view with a profile, scientific name and family

All of this is built now (see section 7).

**Decisions Leo made** (these are his, don't relitigate them):

- C# / ASP.NET Core for the backend (not Java, not NestJS)
- MariaDB for the database
- **Structured filters**, not free-text search only
- Data and business logic first, UI design last (the UI pass was done on 2026-10-22)
- No Google services: no Google Fonts or other Google-hosted assets; system fonts only
- Wikiwand is a trap: use direct `upload.wikimedia.org` / `thumb.wikimedia.org` image URLs

---

## 2. Where everything lives

| Part                   | Path                                                                                                                                 | Remote (branch `master`)                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Angular frontend       | `D:\AnimalDatabaseProject\`                                                                                                          | https://github.com/Hypnos20011/AnimalDatabase_UI     |
| ASP.NET Core API       | `D:\AnimalDatabase.Api\`                                                                                                             | https://github.com/Hypnos20011/AnimalDatabase_Server |
| Production (live)      | https://unusualanimals.duckdns.org, Hetzner VPS `49.12.226.169`, stack from `D:\AnimalDatabase.Api\deploy\` (see section 3)       | same as the API                                      |
| Database               | MariaDB service on `C:` (data in `C:\Program Files\MariaDB*\data`)                                                                   | none                                                 |
| Backups of originals   | `D:\AnimalDatabase-backup-2026-10-22\` (one folder per change, for example `before-wikipedia`, `before-ui-polish`, `before-restyle`) | none                                                 |
| Abandoned Java version | `%USERPROFILE%\Pictures\animal-database-api\`                                                                                        | https://github.com/Hypnos20011/AnimalDatabase        |

### D: is an external SSD

`D:` is an external drive and is sometimes **not plugged in**. Once (2026-10-22 morning)
`Test-Path 'D:\'` was `False` and the whole project looked gone; Leo plugged the drive back in
and everything was intact.

**First action for whoever picks this up:** run `Get-PSDrive -PSProvider FileSystem`. If `D:` is
missing, stop and ask Leo to plug in the drive. Don't rebuild anything.

The database is not affected: MariaDB keeps its data on `C:` and runs independently of `D:`.

Because `D:` is an external drive with a different owner, git refuses to work there unless you
mark the repo as safe. Always pass it per command:

```powershell
$g = @('-c','safe.directory=D:/AnimalDatabaseProject')
git @g status
$a = @('-c','safe.directory=D:/AnimalDatabase.Api')
git @a -C D:\AnimalDatabase.Api status
```

---

## 3. How to run it

1. Make sure `D:` is mounted and the MariaDB service is running (`localhost:3306`).
2. **API:** open `D:\AnimalDatabase.Api` in **Rider** and run the `http` launch profile. It
   listens on `http://localhost:5190` (the `https` profile adds `https://localhost:7106`).
   Command-line alternative: `dotnet run --launch-profile http` in that folder.
   In Development, the Swagger page is at `http://localhost:5190/swagger`. If it ever says "Unable
   to render this definition. The provided definition does not specify a valid version field", the
   browser is running an old cached Swagger UI script (Swashbuckle 6.x only knew OpenAPI 3.0.0-3.0.3,
   the API now serves `"openapi": "3.0.4"`). Press Ctrl+F5 once. Since the rate limiting commit the
   page loads its scripts as `swagger-ui-bundle.js?v=<Swashbuckle version>` (`OpenApi/SwaggerUiAssets.cs`),
   so a package upgrade changes the URLs and the browser can't reuse a stale copy.
3. **Frontend:** open `D:\AnimalDatabaseProject` in **WebStorm** (or a terminal) and run
   `npm start` (`ng serve`). Open `http://localhost:4200`.

**After any API change, the API must be restarted in Rider**; there is no hot reload set up.

### Production: one origin, the API serves the site

In production the browser talks to a single origin. The Angular build (`ng build`, output
`dist/AnimalDatabaseProject/browser`) is copied into the API's `wwwroot`, and the API serves it:

- `UseDefaultFiles` + `UseStaticFiles` for the files, `MapFallbackToFile("index.html")` for deep links
  such as `/animals/12/edit` (`Hosting/SpaHosting.cs`). Only active when `<Spa:RootPath>/index.html`
  exists (`Spa:RootPath` defaults to `wwwroot`; `Spa:Enabled=false` turns it off), so in Rider nothing
  changes.
- `/api/...` and `/swagger/...` never get `index.html`: unknown API paths answer **404** with a JSON
  problem body (`application/problem+json`). Swagger stays Development-only.
- Cache headers: `index.html` `no-cache`; hashed files (`main-XXXXXXXX.js`, `styles-XXXXXXXX.css`,
  `chunk-...`) `public, max-age=31536000, immutable`; everything else one hour.
- The production `environment.ts` uses `apiUrl: '/api'` (same origin). Development keeps
  `environment.development.ts` (`'/api'`) plus `proxy.conf.json`, so `ng serve` still forwards `/api`
  to `http://localhost:5190`.
- CORS origins come from `Cors:AllowedOrigins` (`appsettings.Development.json` keeps
  `http://localhost:4200`; production needs none).

Deployment: `D:\AnimalDatabase.Api\deploy\` holds the multi-stage `Dockerfile` (Node 22 builds Angular
from the UI repo passed in as the named build context `ui-src`, the .NET 10 SDK publishes the API, the
runtime is `mcr.microsoft.com/dotnet/aspnet:10.0` as a non-root user, amd64 and ARM64),
`docker-compose.yml` (caddy, api, mariadb:11.8, nightly backup kept 14 days, named volumes),
`Caddyfile` (`{$DOMAIN}`, plus a 308 redirect from `{$OLD_DOMAIN}`; `<ip-with-dashes>.sslip.io` works without a domain), `.env.example`
(placeholders; the real `.env` is git-ignored and never committed), `schema.sql` (schema + data dump of
the local database, no users), `init/02-app-user.sh` (limited app user) and `README.md` with the exact
Hetzner/Ubuntu 24.04 steps. The old Cloudflare quick tunnel (`start-share.ps1`) has been removed.

To try the production build locally without Docker:

```powershell
npx ng build --output-path "$env:TEMP\adb-ui-dist"
$env:Spa__RootPath = "$env:TEMP\adb-ui-dist\browser"
dotnet run --project D:\AnimalDatabase.Api --launch-profile http --urls http://localhost:5199
```

(Development keeps Swagger on; the site, deep links and `/api` all come from port 5199.)

The connection string is stored in **dotnet user-secrets** (key `ConnectionStrings:AnimalDatabase`,
`UserSecretsId` in the `.csproj`), not in `appsettings.json`. Never print it or commit it. To set
it on a new machine:

```
dotnet user-secrets set "ConnectionStrings:AnimalDatabase" "Server=localhost;Port=3306;Database=animaldatabase;User=root;Password=<password>"
```

### Live server (since 2026-10-23)

- URL: **https://unusualanimals.duckdns.org** (free DuckDNS name, A record to `49.12.226.169`; Let's Encrypt
  certificate managed by Caddy). The old https://49-12-226-169.sslip.io permanently redirects (308) to it,
  keeping the path and query (`OLD_DOMAIN` in the server's `.env`).
- Hetzner Cloud VPS, IPv4 `49.12.226.169`, Ubuntu 26.04, x86_64, 1 vCPU / ~1 GB RAM plus a 2 GB swap
  file. SSH host key: `ED25519 SHA256:fhH6tP06cltVmYU73eeAzyI+vABH8T/PDCpXirfOVlM`.
- Login: `ssh deploy@49.12.226.169` with Leo's ed25519 key from this PC. `deploy` has passwordless sudo
  and is in the `docker` group. Root login and password login are off; ufw allows only 22, 80, 443.
  Unattended security upgrades are on.
- Code: `/opt/animaldatabase/AnimalDatabase_Server` and `/opt/animaldatabase/AnimalDatabase_UI`, copied
  from this PC (no GitHub access on the server). Compose project `animaldatabase`, run from
  `/opt/animaldatabase/AnimalDatabase_Server/deploy`.
- Secrets: the server's `.env` (mode 600) next to `docker-compose.yml`; a copy of the MariaDB root and app
  passwords is in `D:\AnimalDatabase-server-secrets.txt`. The admin key is the same as in
  `D:\AnimalDatabase-admin-key.txt`.
- Database: imported from the local `animaldatabase` on 2026-10-23 (18 animals); the app uses the limited
  user `animaldb_app` (SELECT/INSERT/UPDATE/DELETE only). Local and live data are separate from now on.
- Backups: nightly at 01:30 UTC into `/opt/animaldatabase/backups` on the server (host folder, readable by
  `deploy`, kept 14 days). The old `animaldatabase_mariadb_backups` volume is no longer used.
- Copies on the SSD: `D:\AnimalDatabase.Api\deploy\pull-backups.ps1` copies new dumps into
  `D:\AnimalDatabase-server-backups\` (size and SHA-256 checked, newest 60 kept locally, nothing deleted on
  the server, one line per run in `pull.log`). The Scheduled Task "AnimalDatabase pull backups" (current
  user, no admin) runs it hidden 2 minutes after logon and daily at 18:00, catching up missed runs; with
  the SSD unplugged it does nothing. Restore steps for a local copy: `deploy/README.md`, "Backups and
  restore".
- Watchdog: systemd timer `animaldatabase-watchdog.timer` runs `/usr/local/bin/animaldatabase-watchdog`
  (source `D:\AnimalDatabase.Api\deploy\watchdog\`) every 5 minutes. It checks the site and `/api/animals`
  through the local Caddy plus the caddy/api/mariadb containers; after 2 failed runs in a row it POSTs
  `down` to the alert webhook once, and `recovered` once when healthy again. Webhook URL and key:
  `/etc/animaldatabase-alert.env` on the server only (root, 600; key sent as `Authorization: Bearer`).
  Details: `deploy/README.md`, "Watchdog".

**Redeploy** after committing changes in either repo (only committed `master` is deployed):

```powershell
D:\AnimalDatabase.Api\deploy\redeploy.ps1
```

It archives both repos with `git archive`, copies them over SSH, takes a backup, swaps the folders
(keeping `.env`), and runs `docker compose up -d --build`. The build on the server takes about 10 minutes.

Useful on the server: `cd /opt/animaldatabase/AnimalDatabase_Server/deploy && docker compose ps`,
`docker compose logs -f api`, `docker compose exec -T backup bash /usr/local/bin/backup.sh now`.

### Admin key (protects every write)

Adding, editing and deleting animals and the Wikipedia lookup need the request header
`X-Admin-Key`. Reading the list, the detail pages, Top searches and recording a search stay public.

- **Where the key lives:** dotnet user-secrets of the API, key `Admin:ApiKey` (same secrets store as
  the connection string; on Windows that store sits under `%APPDATA%\Microsoft\UserSecrets\`), plus
  one copy in `D:\AnimalDatabase-admin-key.txt` on the SSD, outside both repos, so Leo can paste it.
  It is never in `appsettings*.json`, the repos, commits or chat. In production set the environment
  variable `Admin__ApiKey` instead of user-secrets.
- **Fail closed:** with no key configured, every write returns 503 ("Editing is turned off...") and
  reads keep working. A missing or wrong key returns 401. The comparison hashes both values with
  SHA-256 and uses `CryptographicOperations.FixedTimeEquals`.
- **Unlocking in the UI:** the quiet "Admin" link in the footer opens `/admin` (one password field,
  Unlock). The key is checked against `GET /api/admin/check` (204 = valid, 401 = wrong) and then kept
  in `sessionStorage` for that tab only. "Lock" in the footer or on `/admin` forgets it. While
  locked, "Add animal", Edit and Delete are hidden and `animals/new` / `animals/:id/edit` redirect to
  `/admin?returnUrl=...`. If any API call answers 401, the UI clears the key and sends you to
  `/admin`.
- **Rotating the key** (PowerShell, in `D:\AnimalDatabase.Api`):

  ```powershell
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $key = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  dotnet user-secrets set "Admin:ApiKey" $key | Out-Null
  [IO.File]::WriteAllText('D:\AnimalDatabase-admin-key.txt', $key)
  Remove-Variable key, bytes
  ```

  Then restart the API in Rider (configuration is read per request, but restart anyway so nothing
  stale is running), and unlock again in the browser with the new key. Old keys stop working at
  once; open tabs get a 401 and are sent back to `/admin`. Don't use `RandomNumberGenerator.Fill`:
  Windows PowerShell 5 doesn't have it.

### Rate limiting (per client IP)

Built-in ASP.NET Core rate limiter (`RateLimiting/` in the API, no extra package). Fixed windows of
60 seconds per client IP, no queueing:

| What | Limit | Notes |
| --- | --- | --- |
| `GET /api/wikipedia/import` | 10 per minute | applies to everyone, with or without the admin key (it calls Wikipedia for us) |
| `POST /api/searches` | 30 per minute | skipped when the request carries a valid admin key |
| `GET /api/admin/check` | 10 per minute | never skipped, so key guessing is slow |
| everything else | 300 per minute | global limit; Swagger is not limited |

Over the limit the API answers **429** with a `Retry-After` header (seconds) and the text "Too many
requests. Try again in N seconds." CORS exposes `Retry-After`.

Settings live in `appsettings.json` under `RateLimiting` (`Enabled`, `WindowSeconds`,
`GlobalPerWindow`, `WikipediaImportPerWindow`, `SearchLogPerWindow`, `AdminCheckPerWindow`); missing
values fall back to the same defaults in `RateLimitSettings.cs`. Override with environment variables
such as `RateLimiting__WikipediaImportPerWindow=20`, or `RateLimiting__Enabled=false` to switch it off.

**How the client IP is found.** Locally, requests reach the API from 127.0.0.1 through the
`ng serve` proxy, which passes `X-Forwarded-For` and `CF-Connecting-IP` through unchanged (checked
against the project's Vite 8.3), so `proxy.conf.json` needs no `xfwd` setting. On the server, Caddy
connects from its fixed Docker address `172.30.0.10`, which compose passes to the API as
`ForwardedHeaders__KnownProxies__0`.

1. If the direct peer is loopback and there is no `X-Forwarded-For`, `CF-Connecting-IP` (when it is
   a valid IP) becomes the client address.
2. `UseForwardedHeaders` then reads `X-Forwarded-For`, trusting loopback (`127.0.0.0/8`, `::1`)
   plus whatever is configured under `ForwardedHeaders:KnownProxies` /
   `ForwardedHeaders:KnownNetworks`. It walks the list from the right, skipping trusted hops.
3. Otherwise the TCP peer address is used. Headers from any non-loopback peer are ignored, so a
   forged header can't dodge the limit. IPv4-mapped IPv6 addresses count as the plain IPv4 address.

Caddy overwrites any `X-Forwarded-For` the visitor sends with the real visitor IP, so behind Caddy each
visitor gets their own limit and a forged header changes nothing. `CF-Connecting-IP` is ignored there
(Caddy is not loopback). Another proxy in front means adding its IP or network to those settings.

**In the UI:** a 429 from the Wikipedia lookup shows "Too many lookups. Try again in a minute." (or
"in N seconds" when the server says 45 seconds or less) in the usual inline error spot. The admin
unlock page says "Too many attempts. Try again ...". Recording a search stays silent: the search and
opening the animal keep working when the search log is limited. Helper: `src/app/shared/rate-limit.ts`.

Checks used after frontend changes (run in `D:\AnimalDatabaseProject`):

```powershell
npx prettier --write src
npx ng build --output-path "$env:TEMP\adb-buildcheck"
npx ng test --watch=false
```

`ng test` runs Vitest; all `*.spec.ts` files must pass. API tests: `dotnet test` on
`D:\AnimalDatabase.Api\tests\AnimalDatabase.Api.Tests` (xUnit, offline fixtures, fake repository for
`SearchesController`). `RateLimitingTests`, `SwaggerTests`, `SpaHostingTests` (site fallback, cache
headers, 404 JSON for unknown `/api` paths) and `DeploymentConfigTests` (CORS and proxy settings) start the whole API in memory with
`WebApplicationFactory` (`ApiFactory.cs`: test key, dummy connection string, fake search repository,
and an `X-Test-Peer` header that sets the caller's IP). While Rider is running the API, build and test
into a temp folder so the locked `bin` doesn't matter:
`dotnet test tests\AnimalDatabase.Api.Tests --artifacts-path "$env:TEMP\adb-test"`.

---

## 4. Architecture

### Frontend: Angular 22 (`D:\AnimalDatabaseProject`)

Angular 22.2, TypeScript 6, standalone components (no `standalone: true` needed), signals
(`signal`, `computed`, `toSignal`), the new control flow (`@if`, `@for ... track`), reactive forms
for the add/edit form, and Prettier (`printWidth` 100, single quotes). Angular 22 file names have
no `.component` suffix (`app.ts`, `animals-list.ts`, `templateUrl` / `styleUrl`).

```
src/
  index.html, main.ts, styles.css
  environments/
    environment.ts               apiUrl used by production builds
    environment.development.ts   swapped in for dev builds via fileReplacements in angular.json
  app/
    app.ts / app.html / app.css  top bar ("Animal Database" links home, Random animal + Add animal
                                 text links on the right; Add animal only when unlocked) +
                                 <router-outlet> + quiet footer with "Admin" / "Lock"
    random-animal.service.ts     Random animal from the top bar (uses AnimalListState.randomPool)
    app.config.ts                provideRouter(routes, withComponentInputBinding()),
                                 provideHttpClient(withInterceptors([adminKeyInterceptor]))
    app.routes.ts                routes, see below
    app.spec.ts                  app creates, header title, top-bar links and footer link, locked and unlocked
    admin/                       admin-key.service.ts (key signal + sessionStorage, verify via
                                 /api/admin/check), admin-key.interceptor.ts (adds X-Admin-Key to
                                 apiUrl requests, clears the key on 401), admin.guard.ts,
                                 admin-unlock.ts (route `admin`)
    animal.service.ts            /api/animals and /api/wikipedia calls
    search.service.ts            /api/searches calls (getTop(limit, days)), spec checks the query params
    animal-model/                animal.model.ts (Animal, NewAnimal, NewAnimalImage),
                                 animal-image.model.ts, top-search.model.ts, wikipedia-import.model.ts
    animals-list/                list page + animal-list-state.ts, top-search-window.ts (Top searches window options),
                                 active-animal.ts (which row the preview pane shows, row numbers)
    shared/iucn.ts               IUCN status to code (LC, NT, VU, EN, CR, EW, EX, DD; dash when empty)
    animal-detail/               detail page
    animal-form/                 add / edit form
```

Routes (`app.routes.ts`):

| Path               | Component                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ |
| `''`               | `AnimalsList`                                                                        |
| `admin`            | `AdminUnlock` (unlock / lock; optional `returnUrl` query param)                      |
| `animals/new`      | `AnimalForm` (add; `adminGuard`)                                                     |
| `animals/:id/edit` | `AnimalForm` (edit, same component; `id` arrives as a component input; `adminGuard`) |
| `animals/:id`      | `AnimalDetail`                                                                       |
| `**`               | redirect to `''`                                                                     |

Route parameters reach components as inputs (`id = input<string>()`) because of
`withComponentInputBinding()`.

API base URL: `src/environments/environment.ts` (production build) and `environment.development.ts`
(`ng serve`), both `apiUrl: '/api'`: same origin in production, `proxy.conf.json` in development.
Services build their URLs from `environment.apiUrl`.

### Backend: ASP.NET Core .NET 10 (`D:\AnimalDatabase.Api`)

Controllers-style Web API targeting `net10.0` (API and tests; needs the .NET 10 SDK). NuGet packages:
**Dapper**, **MySqlConnector**, **Swashbuckle.AspNetCore** 10.x. Don't add EF Core; it fights Dapper.

```
Program.cs                      DI, camelCase JSON, CORS from config, Dapper underscore mapping, client IP + rate limiter, site hosting
Controllers/
  AdminController.cs            /api/admin/check
  AnimalsController.cs          /api/animals
  SearchesController.cs         /api/searches
  WikipediaController.cs        /api/wikipedia/import
Data/
  AnimalRepository.cs           animals + animal_images SQL (Dapper)
  ISearchRepository.cs          interface the controller uses (lets tests fake it)
  SearchRepository.cs           searches SQL
Services/
  WikipediaImporter.cs          Wikipedia + Wikidata lookup (typed HttpClient, 15 s client timeout, 10 s per attempt, one retry, own User-Agent)
Models/                         Animal (in Animals.cs), AnimalImage, CreateAnimalRequest,
                                CreateAnimalImageRequest, CreateSearchRequest, TopSearch, WikipediaImportResult
Security/
  AdminKey.cs                   header/config names, constant-time key comparison
  RequireAdminKeyAttribute.cs   [RequireAdminKey] filter: 503 when no key is configured, 401 on a bad key
RateLimiting/
  RateLimitSettings.cs          RateLimiting:* settings and defaults
  RateLimitPolicies.cs          policy names used by [EnableRateLimiting]
  RateLimitingSetup.cs          limiter registration, admin bypass, 429 + Retry-After
  ClientIp.cs                   forwarded headers (loopback only), CF-Connecting-IP, partition key
OpenApi/
  SwaggerUiAssets.cs            adds ?v=<version> to Swagger UI script and style URLs
Hosting/
  SpaHosting.cs                 serves the Angular build, index.html fallback, 404 JSON for /api and /swagger, cache headers
  SpaSettings.cs                Spa:Enabled, Spa:RootPath (default wwwroot)
  CorsSetup.cs                  Cors:AllowedOrigins
Database/searches.sql           CREATE TABLE for searches
deploy/                         Dockerfile, docker-compose.yml, Caddyfile, .env.example, schema.sql, init/, backup/, README.md
```

Two gotchas that cost real time:

1. `Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true` is what maps `common_name` to
   `CommonName`. Without it every field comes back null.
2. The JSON options type is **`Microsoft.AspNetCore.Mvc.JsonOptions`**, not
   `Microsoft.AspNetCore.Http.Json.JsonOptions` (that one is for minimal APIs; controllers ignore
   it). No Newtonsoft; System.Text.Json only.

Repositories are singletons that read the connection string from configuration and open a new
`MySqlConnection` per call. Create and update run inside a transaction.

---

## 5. API endpoints

| Method | Path                                | What it does                                                                                                                                                                                                           |
| ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/animals`                      | All animals ordered by common name, each with `thumbnailUrl` (first image by `sort_order`, `id`)                                                                                                                       |
| GET    | `/api/animals/{id}`                 | One animal (404 if missing)                                                                                                                                                                                            |
| GET    | `/api/animals/{id}/images`          | Images of an animal ordered by `sort_order`, `id`                                                                                                                                                                      |
| POST   | `/api/animals`                      | Create animal + images (`CreateAnimalRequest`), returns 201 with the animal                                                                                                                                            |
| PUT    | `/api/animals/{id}`                 | Update the animal; **replaces all its images** (deletes then re-inserts); 404 if missing                                                                                                                               |
| DELETE | `/api/animals/{id}`                 | Delete; images go with it (`ON DELETE CASCADE`), searches keep their row with `animal_id` set to NULL; 204 or 404                                                                                                      |
| POST   | `/api/searches`                     | Body `{ queryText, animalId }`; records a search only if the animal exists (else 404); 204                                                                                                                             |
| GET    | `/api/searches/top?limit=5&days=30` | Most-opened animals: `{ animalId, commonName, thumbnailUrl, searchCount }`. `limit` clamped to 1-20 (default 5). `days` = window in days, 1-365 (default 30), `0` = all time; anything else is a 400                   |
| GET    | `/api/admin/check`                  | 204 if the `X-Admin-Key` header is valid, 401 if not, 503 if no key is configured                                                                                                                                      |
| GET    | `/api/wikipedia/import?q=...`       | `q` = animal name or Wikipedia link; returns a `WikipediaImportResult` to pre-fill the form. 400 for empty/over 300 chars or a non-article link, 404 if nothing found, 502 if Wikipedia is unreachable, 504 on timeout |

POST, PUT and DELETE on `/api/animals` (images are saved through the animal's `images`) and the
Wikipedia import need the `X-Admin-Key` header (`[RequireAdminKey]`); see "Admin key" in section 3.
The other endpoints are public.

Validation is on `CreateAnimalRequest` via data annotations (lengths match the columns, numbers

> = 0, image `kind` must be `male|female|baby|unspecified`, image URL max 500 chars).

---

## 6. Database

MariaDB 11.8 on `localhost:3306`, schema **`animaldatabase`**.

### `animals`

```sql
CREATE TABLE animals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    common_name        VARCHAR(120)  NOT NULL,
    scientific_name    VARCHAR(150)  NULL,
    family             VARCHAR(120)  NULL,
    taxonomic_class    VARCHAR(40)   NULL,
    is_domesticated    TINYINT(1)    NOT NULL DEFAULT 0,
    size_length_cm_min DECIMAL(7,1) NULL,
    size_length_cm_max DECIMAL(7,1) NULL,
    size_height_cm_min DECIMAL(7,1) NULL,
    size_height_cm_max DECIMAL(7,1) NULL,
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

Length and height columns were changed from `INT` to `DECIMAL(7,1)` on 2026-10-22 so small animals (for example a 0.5 mm tardigrade, 0.05 cm, is stored as 0.1 cm) don't end up as 0 cm. The API uses `decimal?` for them and the form accepts one decimal (step 0.1).

Values used by the app:

- `taxonomic_class`: `mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`
- `iucn_status` (lowercase): `least concern`, `near threatened`, `vulnerable`, `endangered`,
  `critically endangered`, `extinct in the wild`, `extinct`, `data deficient`
- `profile` may end with `Fun fact: ...` (see Wikipedia lookup)

### `animal_images`

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

`kind`: `male`, `female`, `baby`, `unspecified`. The form has one URL field per kind; images are
saved in that order (male, female, baby, other), so the first filled one becomes the thumbnail.

### `searches` (script: `D:\AnimalDatabase.Api\Database\searches.sql`)

```sql
CREATE TABLE IF NOT EXISTS searches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    query_text VARCHAR(255) NOT NULL DEFAULT '',
    animal_id INT NULL,
    searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_searches_searched_at (searched_at),
    INDEX idx_searches_animal (animal_id),
    CONSTRAINT fk_searches_animal FOREIGN KEY (animal_id) REFERENCES animals (id) ON DELETE SET NULL
);
```

One row per time an animal was opened from the list or the suggestions; `query_text` is what was
in the search box at that moment (can be empty).

### Data notes

The animal rows change as Leo adds animals through the form, so they aren't listed here. Older
notes, not re-checked today:

- The Giant huntsman spider was once saved with `taxonomic_class = 'arachnids'`; Leo fixed it
  to `invertebrate`.
- The Marbled Cat had `lifespan_years_min = 0` (should be about 10-12). It may still need fixing;
  it can be done through the Edit page now.

---

## 7. Features

### List page (`animals-list/`)

- **Search box** ("Search name, habitat or range..."): filters the list by common name,
  scientific name, **habitat**, **range** (`range_region`) and profile text. Matching lives in
  `animals-list/animal-search.ts` (`normalizeText`, `matchAnimal`, `matchRank`, `matchHint`):
  query and fields are trimmed, lowercased and whitespace-collapsed, then the whole query must
  appear as a substring of a field. It's all client-side over `GET /api/animals`; the API isn't
  involved. From 2 typed characters a **suggestions dropdown** shows up to 8 animals whose common
  or scientific name matches (name matches only), each with its thumbnail.
  - Ranking (Sort by "Best match", the default): name matches first, then habitat, then range,
    then profile-only matches; ties and the no-query case sort by name A-Z. Any other Sort by
    choice is kept as chosen.
  - Rows that matched only through habitat or range show a small teal hint: "Matches habitat",
    "Matches range" or "Matches habitat and range". Name and profile-only matches show no hint.
- **Index list**: numbered rows (01, 02, ...) with thin dividers. Each row is a link to the
  detail page and shows the name, scientific name, class and the IUCN status code (a dash when
  there is no status; screen readers get the full status). Header: "Animals" plus the count.
- **Preview pane** on the right (sticky, 280px): the whole picture (never cropped, at most min(58vh, 28rem) tall), number, name, scientific name and
  "FAMILY / HABITAT" of the active row. The first animal is active by default; hovering or
  keyboard-focusing a row makes it active (`pickActive()` in `active-animal.ts`; if the active
  animal is filtered out it falls back to the first one). Tapping a row opens the detail page.
  Below 900px the pane is hidden and every row gets a small thumbnail; below 600px the class
  column is hidden too.
- **Filters popup** (modal), opened with the **Filters** button. The button shows a badge with the
  number of active filters; **Clear all** appears next to it and in the popup footer. Closes on
  the X, the "Show N animals" button or a click on the backdrop. Filters in it:
  - Class chips and IUCN status chips, built from the values present in the data. Animals with no
    class/status aren't excluded by these chips.
  - "Wild only" (hides domesticated animals).
  - **Length (cm)** and **Weight (kg)** ranges (from / to). An animal matches if its min-max range
    overlaps the filter; animals with no length/weight are excluded while that range is set.
  - Active count = each selected class + each selected status + wild only + 1 per range in use.
- **Sort by** dropdown: Best match (default), Name (A to Z), Name (Z to A), Longest first,
  Shortest first, Heaviest first, Lightest first, Newest first. Length/weight sorting uses the max value (falls back to
  min); animals without a value go last; ties sort by name. "Newest" sorts by `id` descending.
- **State kept when navigating back**: query, filters, ranges and sort live in the root-provided
  `AnimalListState` service (`animals-list/animal-list-state.ts`), not in the component, so they
  survive going to an animal and back. They reset on a full page reload. The popup open state
  doesn't persist.
- **Random animal** (text link in the top bar, every page): opens a random animal from the
  currently filtered list (falls back to all animals if the filters match none). The list page
  shares the ids through `AnimalListState.randomPool`; if the pool is empty (e.g. the list was
  never opened) `RandomAnimalService` loads all animals and picks one.
- **Top searches**: one line under the search bar with name and count links from `GET /api/searches/top`, loaded when
  the list opens.
  - A small select next to the heading picks the window: **Last 7 days**, **Last 30 days**
    (default) or **All time** (`days` = 7, 30, 0). The choice lives in `AnimalListState`
    (`topSearchDays`), so it survives going to an animal and back; options and wording are in
    `animals-list/top-search-window.ts`.
  - The window counts from now on the database clock: `searched_at >= NOW() - INTERVAL days DAY`
    (`searched_at` is a `TIMESTAMP` filled by `DEFAULT current_timestamp()`, so both sides use
    the same session time zone; index `idx_searches_searched_at` covers the filter).
  - Empty window: "No searches in the last 30 days." / "No searches in the last 7 days." /
    "No searches yet." (all time). If the request fails: "Top searches are unavailable right now."
  - Opening an animal from the **list rows or the suggestions** calls `POST /api/searches`
    (`recordOpen()` / `selectAnimal()`), so it counts. That's the same whether the query matched the name,
    habitat or range: Top searches counts opened animals, and `query_text` keeps what was typed.
  - Clicks on **Top searches** entries and **Random animal** navigate directly and do **not**
    count.
- **Add animal** (text link in the top bar, teal while on the form) goes to `/animals/new`.

### Detail page (`animal-detail/`, route `animals/:id`)

- Loads the animal and its images. Photo first: the first image is a full-width hero
  (`min(60vh, 500px)`, cropped with `object-fit: cover`) with the name and scientific name on a
  dark gradient at its bottom; its caption sits under it. Any further images appear in a gallery
  near the end, with captions. Without images the name shows as a plain heading.
- Facts in columns with a thin left rule: IUCN status (coloured dot + label), weight, lifespan,
  habitat, range.
- **More details / Hide details** toggle shows the "nerd" facts: family, class, wild/domesticated,
  body length, shoulder height.
- Profile text. If the profile contains `Fun fact:`, everything after it is shown in its own
  **Fun fact** box (`profileParts` in `animal-detail.ts`); the stored profile isn't changed.
- Actions: **Back to list**, **Edit** (`/animals/:id/edit`), **Delete** (in-app confirm dialog,
  then `DELETE /api/animals/{id}` and back to the list; shows an error if it fails).

### Add / edit form (`animal-form/`, routes `animals/new` and `animals/:id/edit`)

- One component for both. With an `id` it loads the animal and its images, fills the form, and
  **Save sends `PUT /api/animals/{id}`** (an update, not a new row), then returns to the detail
  page. Without an `id` it sends `POST` and returns to the list.
- Fields: all animal columns, min/max inputs for length, height, weight and lifespan, class and
  IUCN dropdowns, a Domesticated checkbox, and 4 picture URL fields (Male, Female, Baby, Other)
  with previews and an `http(s)://` check. Existing captions are kept on edit; new images get the
  field label as caption.
- **Duplicate warning** (yellow box under Common name): lists existing animals whose common name
  **or** scientific name equals what's typed, ignoring case and extra spaces. The animal being
  edited is excluded. It's only a warning; saving isn't blocked.
- **Look up on Wikipedia** box at the top (see below). Filled values overwrite the current form
  values; the Wikipedia picture goes into the "Other" picture field only if that's empty. A
  message says how many fields were filled.

### Wikipedia lookup (`Services/WikipediaImporter.cs`, `GET /api/wikipedia/import?q=`)

Wikidata is always used first; everything read from the article only fills fields that are still
empty.

1. **Find the article**: if `q` is a `*.wikipedia.org/wiki/...` link it's parsed directly.
   Otherwise it searches English Wikipedia (`generator=search`, 8 results) and takes the first
   result that is not a disambiguation page.
2. **REST summary** (`/api/rest_v1/page/summary/...`): title, intro extract, article URL and the
   Wikidata item id. Disambiguation pages return 404.
3. In parallel: page image (`prop=pageimages`, 1280px thumbnail), image info for all article
   images, the full plain-text article, the wikitext, Wikidata claims and the SPARQL ancestor query.
4. **Wikidata claims** (`wbgetentities`):
   - `P225` scientific name
   - `P141` IUCN status, mapped from known item ids; for newer status items not in the map it
     falls back to the item's English label (for example "endangered species" becomes
     "endangered")
   - `P2067` mass (converted to kg), `P2043` length (cm, rounded to one decimal half away from
     zero; a real length never becomes 0, the minimum is 0.1 cm), `P2250` lifespan (years);
     min/max come from all values including lower/upper bounds; deprecated values are skipped
   - For these quantities only values with no `P3831` role qualifier, or with role "adult", are
     used, so chick/newborn weights don't end up in the range
5. **One SPARQL query** on `query.wikidata.org` walks the ancestor tree (`P171*`): the ancestor
   with rank "family" becomes the family, and the set of ancestor names decides the class
   (Mammalia = mammal, Aves = bird, Reptilia/Squamata/Testudines/... = reptile, Amphibia =
   amphibian, fish groups = fish, Animalia without Vertebrata = invertebrate).
6. **Infobox fallbacks** (wikitext `{{Speciesbox}}`/`{{Taxobox}}`/`{{Automatic taxobox}}`):
   `status` (only when `status_system` is IUCN, not CITES) gives the IUCN status, and `family`
   from the infobox or, if missing, by walking the `Template:Taxonomy/...` parent chain.
7. **Text fallbacks** from the article (sections like References/See also cut off, citation and
   markup stripped):
   - length (cm/mm/m/in/ft), weight (g/kg/lb) and lifespan ranges from sentences with "long",
     "length", "weighs", "lives", "lifespan" etc. Only for species (scientific name with a space),
     so genus/order pages don't get one species' numbers. Sentences about birth, hatchlings,
     eggs, tadpoles, newborns, records or single specimens are skipped.
   - habitat and range region from phrases like "inhabits ...", "found in ...", "native/endemic
     to ...". Habitat must contain a habitat noun (forest, swamp, grassland, waters, ...); range
     must look geographic (capitalised place or ocean/sea/tropical/...). Historic or former ranges
     are skipped.
8. **Common name**: if the article is titled by the Latin name, the typed name is kept; for link
   imports the bold English name from the article's first sentence is used.
9. **Picture**: if the lead image is a drawing, map, diagram, skeleton, old plate or SVG
   (judged from file type, categories, description and date), the first real photo in the article
   is used instead (1280px thumbnail when wider).
10. **Profile + fun fact**: the first two intro sentences (IPA brackets stripped) become the
    profile. The fun fact is the best-scoring sentence from the rest of the article (superlatives,
    "the only", unique behaviour; penalised for conservation-status, plain measurements, weak
    openers like "Another"/"Like most" and history phrasing). It never repeats a profile sentence;
    if nothing scores high enough there is no fun fact. Appended as `\n\nFun fact: ...`.
11. **Retry**: each Wikipedia/Wikidata request has a 10 s attempt timeout and is retried once
    after 400 ms on a 5xx or network error/timeout (404s are not retried). A required request that
    still fails returns 502 (5xx) or 504 (timeout) from the controller; optional requests
    (images, wikitext, article text) just leave their fields empty.

The result also has `habitat` and `rangeRegion`, but the frontend form (`applyImport` in
`animal-form.ts`) does not map those two yet.

Known gaps: text parsing is conservative, so sizes or lifespan can still be empty, habitat can
be generic ("Forests") and range can be long; the fun fact can be missing. Always check the filled
values before saving.

### UI / theme

- Dark, flat editorial theme (redesign of 2026-10-23: "Index" list + photo-first detail page).
  Background `#0e1012`, surfaces `#16191c` / `#1c2024`, borders `#262b30`, input borders
  `#5f686e`, text `#f2f4f5`, muted text `#9aa3a8`, teal accent `#2bb3ac` (hover `#3fc7c0`).
  Text on teal (primary buttons, active chips, filter badge) is dark `#061615`, because white
  on teal fails AA. Danger text `#ff7b70`; the filled delete button is `#b8322a` with white text.
  The duplicate warning uses `#241f10` / `#6b5a26` / `#f0d58c`. All pairs were checked for WCAG AA.
- IUCN tones (via `[data-status]`, used by `.status` and the list's `.code`): teal by default,
  amber `#f0b44c` for vulnerable/endangered, red `#ff6b5e` for critically endangered / extinct in
  the wild / extinct, muted for data deficient.
- Font: **Inter Tight**, self-hosted (variable woff2, latin + latin-ext, normal + italic) in
  `public/fonts/inter-tight/` with its OFL licence; `@font-face` rules are in `styles.css`, and
  `index.html` preloads the latin normal file. No CDN or Google services. Fallback: Segoe UI,
  Arial.
- Sizes: page title (`h2`) 2.75rem / 800; list row names 1.625rem (26px) / 700, inactive rows in
  `#858e94`, the active row white with a teal number and arrow; preview name 1.5rem; detail title
  5rem (2.75rem on phones).
- Top bar: sticky, solid background with a bottom border (no transparency, so nothing shows
  through when scrolling), height `--header-height` (60px). Brand in uppercase with a teal dot;
  Random animal and Add animal are small plain text links on the right.
- All colours, radii (2-3px), the focus ring and `--header-height` are CSS custom properties in
  `:root` of `src/styles.css`. Shared classes live there too: `.btn` / `.btn-primary` /
  `.btn-secondary` / `.btn-danger` / `.btn-sm`, `.chip`, `.status` / `.code`, `.page-head`,
  `.visually-hidden`, `.modal*` (filter popup), `.suggestions`, the search field, form controls.
- Flat design: 1px borders, no shadows (the focus ring is the only box-shadow), no hover
  animations. Two-column form on wide screens, one column on phones; the filter popup becomes a
  bottom sheet on phones.
- Keep component CSS under Angular's 4 kB per-component budget (warning at 4 kB, error at 8 kB);
  shared styles go in `styles.css`.

---

## 8. Working conventions

- **No comments in code**, in any language (C#, TS, HTML, CSS). Leo was firm about this.
- **Commit and push after every major change**, in the repo it belongs to (frontend:
  AnimalDatabase_UI, API: AnimalDatabase_Server, branch `master`). Use `-c safe.directory=...`
  (section 2).
- **Back up originals before changing them**, into `D:\AnimalDatabase-backup-2026-10-22\before-<change>\`
  (or a new dated folder).
- Run Prettier, the build and the tests after frontend changes (section 3).
- **Restart the API in Rider** after API changes.
- Files are UTF-8 without BOM. Prettier writes LF line endings; git may warn about CRLF on
  Windows, which is harmless.
- Don't change the database schema or data without asking Leo.
- Never put the connection string or other secrets in files, commits or chat.

### How Leo likes to work when he types the code himself

- **One step at a time.** In his words: "you tell me what i am doing and i do it and ask if i have
  questions and just like a manual only one step at time".
- **One file at a time**, clearly labelled ("this is the new file" vs "this is the line to add").
  Long multi-file dumps don't work for him.
- **Let him write SQL himself, then review it.** Reminders he finds useful:
  text `'value',`, numbers `123,`, unknown `NULL,`, no trailing comma on the last value.

---

## 9. Working with Wikimedia image URLs

Picture fields need direct image URLs.

**Wrong** (all break `<img src>`):

- `img.wikiwand.com/...` (mirror, can block hotlinking)
- `www.wikiwand.com/en/Tiger#/media/File:...` (an HTML page, not an image)
- `en.wikipedia.org/wiki/File:...` (the file description page, not the file)
- Anything with `?utm_source=...` appended (strip it)

**Right** (direct CDN URLs, both hosts work):

```
https://upload.wikimedia.org/wikipedia/commons/thumb/<a>/<ab>/<File>.jpg/800px-<File>.jpg
https://thumb.wikimedia.org/wikipedia/commons/thumb/<a>/<ab>/<File>.jpg/800px-<File>.jpg
```

How to get one: right-click the image on Wikipedia and choose "Copy image address" (not "Copy
image"). Pasted into a new tab it should show only the photo. The form shows this hint too, and
the Wikipedia lookup fills a correct URL automatically.

---

## 10. Known issues and ideas

Known issues:

- Wikipedia lookup: text-parsed sizes/lifespan/habitat/range are conservative and can be empty or
  generic; fun-fact choice is heuristic; English Wikipedia only for name searches; the form doesn't
  fill habitat/range from the lookup yet.
- Local and live databases are separate: animals added locally don't appear on the live site (add them
  there with the admin key, or move data by hand).
- The server has only ~1 GB RAM; builds rely on the 2 GB swap file.
- List state (filters, sort, query) resets on a full page reload; it isn't in the URL.
- PUT replaces all images of an animal, so image ids change on every save.
- The admin key is one shared secret, not user accounts; anyone who has it can edit. Rotate it if
  it may have leaked (section 3).

Ideas (not started; ask Leo before building):

- Put filters/sort in the URL query string so they survive reloads and can be shared.
- Height and lifespan range filters, like length and weight.

---

## 11. Abandoned Java version

A Java / Spring Boot version (Gradle, Flyway migrations, one commit) exists at
`%USERPROFILE%\Pictures\animal-database-api\`, remote https://github.com/Hypnos20011/AnimalDatabase.
Leo dropped it and started fresh with C# + Angular. Don't touch it unless he asks.

---

## 12. Resuming: first moves

1. `Get-PSDrive -PSProvider FileSystem`: check that `D:` is there.
2. Run the API in Rider and `npm start` in the frontend, open `http://localhost:4200`, check that
   the list loads.
3. `git log --oneline` in both repos to see the latest work (frontend commits and API commits are
   separate).
4. Ask Leo what he wants next; see the ideas list above.
