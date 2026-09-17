# Chess Analyzer Frontend

Angular frontend for the Chess Analyzer API.

## Development

Install dependencies once:

```bash
npm install
```

Start the Angular development server with live reload:

```bash
npm run start
```

Open `http://localhost:4200/`. The development API URL is configured in `src/environments/environment.ts` and defaults to `http://127.0.0.1:5000/api`.

## API Types

Start the backend first, then regenerate the OpenAPI TypeScript contract:

```bash
npm run api:types
```

This writes `src/api/schema.d.ts`. It is generated code and should not be edited manually. The API client imports its `components.schemas` types from this file, so backend contract changes become TypeScript errors or updated response types in the frontend.

## Builds

Build the optimized production bundle:

```bash
npm run build
```

The output is written to `dist/chess-analyzer-frontend`. Production builds replace `src/environments/environment.ts` with `src/environments/environment.prod.ts`; the production default uses `/api`, which expects the deployed frontend and API to share an origin or be served through a reverse proxy.
