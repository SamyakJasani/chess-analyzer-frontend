# Frontend Integration

## API contract

The backend publishes the OpenAPI contract at:

```text
http://127.0.0.1:5000/api/openapi.json
```

The frontend does not consume this automatically. Either generate types/client code from the document or manually implement the response types from the contract.

For a TypeScript frontend, one option is:

```bash
npx openapi-typescript http://127.0.0.1:5000/api/openapi.json -o src/api/schema.d.ts
```

The frontend should use the generated types for API responses and keep all HTTP calls in one API module.

## Available endpoints

### Player profile

```text
GET /api/users/{username}
```

Example:

```text
GET http://127.0.0.1:5000/api/users/Sam28062002
```

Use this to display the selected user's profile, avatar, title, rating metadata, followers, status, and Chess.com link.

### Latest games

```text
GET /api/users/{username}/games
```

Example:

```text
GET http://127.0.0.1:5000/api/users/Sam28062002/games
```

The backend selects the latest archive and returns its games newest first. Each game includes `url`, `pgn`, players, result, ratings, time control, FEN, and other Chess.com metadata.

## Recommended frontend views

The frontend needs three views. These can be three routes or one responsive shell with three panels:

1. **Player selection/profile**
   - Input or dropdown for a Chess.com username.
   - Load `/api/users/{username}` after selection.
   - Show profile information and a button to load games.
   - Show loading, not-found/API error, and empty profile states.

2. **Games list**
   - Load `/api/users/{username}/games` when a user is selected.
   - Show the latest archive and games in the order returned by the backend.
   - Display date, players, ratings, result, time class, and game link.
   - Selecting a row should store the selected game in client state and open the analysis view.
   - Show loading, API error, and no-games states.

3. **Game analysis**
   - Parse the selected game's `pgn` in the browser using a chess library such as `chess.js`.
   - Render the board and move list.
   - Add previous/next move controls and allow clicking a move.
   - Run Stockfish.js in a Web Worker so engine analysis does not block the UI.
   - This view does not need another backend request because the complete PGN is already included in the games response.

A practical route structure is:

```text
/                         player selection/profile
/users/:username          profile and games list
/users/:username/games/:gameId  game analysis
```

The `gameId` can be the game's `uuid` or a URL-safe client-side identifier. Do not use the array index as a long-term identifier if stable game IDs are available.

## Request flow

1. User enters or selects a username.
2. Frontend requests `/api/users/{username}`.
3. On success, frontend requests `/api/users/{username}/games`.
4. Frontend renders the returned games in descending order.
5. User selects a game.
6. Frontend parses its PGN locally and starts Stockfish.js in a Web Worker.

The frontend should cancel or ignore stale requests when the user changes usernames quickly, and it should not call the games endpoint until the profile request succeeds.

## Frontend coding prompt

Use this prompt with a frontend coding agent:

> Build the frontend for the Chess Analyzer API using the OpenAPI contract at `http://127.0.0.1:5000/api/openapi.json`. Generate or infer typed API models from that contract and keep requests in one API client module. Implement three views: player profile/selection, latest games list, and game analysis. The profile view calls `GET /api/users/{username}`. After a successful profile response, call `GET /api/users/{username}/games`; render the returned `games` array exactly in its received order because the backend already returns newest games first. The games list must show players, ratings, result, date/time metadata when available, time class, and the Chess.com game URL. Selecting a game opens the analysis view using the selected game's PGN without another backend request. Parse PGN in the browser with `chess.js`, render an interactive board and move list, and run Stockfish.js in a Web Worker. Include loading, empty, not-found, API error, malformed-PGN, and engine-loading states. Use the generated OpenAPI response types, keep the backend base URL configurable with an environment variable, and do not hardcode the username. Make the layout responsive: profile and games navigation on desktop, stacked panels on mobile, and clear keyboard-accessible controls for move navigation.

## CORS and local development

If the frontend runs on a different origin, such as `http://localhost:5173`, Flask must enable CORS for that development origin. The current backend does not include CORS yet. Add `Flask-Cors` only when the frontend is ready to run separately, then configure the exact frontend origin rather than allowing every origin.
