# Unusual Animals UI

The Angular site for [Unusual Animals](https://unusualanimals.duckdns.org), a browsable index of unusual animals in
English and German. Visitors can search, filter and compare animals. With the admin key, animals can be added, edited
and deleted.

The API lives in a separate repository (`AnimalDatabase_Server`, locally `D:\AnimalDatabase.Api`).

## Run it locally

Start the API first, then:

```bash
npm ci
npm start
```

Open `http://localhost:4200`. Calls to `/api` go to the API on `http://localhost:5190` (see `proxy.conf.json`).

## Tests and build

```bash
npm test -- --watch=false
npm run build
```

Tests use Vitest with jsdom, so no browser is needed. The production build goes to `dist/AnimalDatabaseProject/browser`.

## Where things are

| Folder                 | What it holds                                         |
|------------------------|-------------------------------------------------------|
| `src/app/animals-list` | Main page: search, filters, sorting and top searches  |
| `src/app/animal-detail`| Detail page for one animal                            |
| `src/app/animal-form`  | Admin form with Wikipedia lookup                      |
| `src/app/animal-stats` | Stats page                                            |
| `src/app/admin`        | Admin key unlock, guard and HTTP interceptor          |
| `src/app/shared`       | Shared services, formatting and `i18n` dictionaries   |

## Deploying

The site is built into the API's Docker image. See `deploy/README.md` in the API repository.
