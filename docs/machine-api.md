# Machine API

This document describes the machine-facing HTTP API used by a cabinet or other trusted game client.

These routes are authenticated with a machine bearer token and are implemented under [`app/api/game/song/`](../app/api/game/song/) and [`app/api/game/library/`](../app/api/game/library/).

## Authentication

Every machine request must send:

```http
Authorization: Bearer <machine-token>
```

Machine tokens are managed from the admin UI.

If the token is missing or invalid:

- `GET /api/game/song/current` returns `401` with an empty body
- the mutation routes return `401` JSON:

```json
{ "error": "Unauthorized" }
```

## Current Model

The machine API works against the current queue/current-song state.

Current behavior:

- if a queue entry exists, the queue head is treated as the current song
- `start` marks the current queue head as `playing`
- `skip` removes the current queue head and advances
- `finish` records play history, removes the current queue head, and advances
- `drop` removes side 2 from the current queue head before it starts

Two players:

- side 1 is the queue entry's owner; side 2 is the player who joined it from the web queue, if any
- joins are possible only while the entry is `queued`; `start` fixes the players
- `start` keeps side 2 only if the cabinet lists it in `players`; otherwise the join is dropped
- `finish` records one play per reported side, but only for sides that started; other sides' results are ignored
- requests without `players` / `results` are one-player requests for side 1, so older cabinet themes keep working

## Routes

### `GET /api/game/song/current`

Returns the current song context for the machine.

#### Success: no current song

```json
{
  "song": null,
  "player": null,
  "user_highscore": null,
  "server_highscore": null
}
```

#### Success: current song present

```json
{
  "queue_item_id": 42,
  "song": {
    "file_path": "1Arc2008 - DDR X/Butterfly",
    "difficulty_name": "Hard"
  },
  "player": {
    "id": 12,
    "display_name": "Jordan"
  },
  "user_highscore": {
    "score": 97.43,
    "grade": "AA"
  },
  "server_highscore": {
    "score": 99.12,
    "grade": "AAA",
    "held_by": "Alex"
  },
  "chart_highscores": [
    {
      "chart_id": 1001,
      "difficulty_name": "Easy",
      "meter": 4,
      "user_highscore": null,
      "server_highscore": {
        "score": 95.12,
        "grade": "A",
        "held_by": "Alex"
      }
    },
    {
      "chart_id": 1002,
      "difficulty_name": "Hard",
      "meter": 8,
      "user_highscore": {
        "score": 97.43,
        "grade": "AA"
      },
      "server_highscore": {
        "score": 99.12,
        "grade": "AAA",
        "held_by": "Alex"
      }
    }
  ]
}
```

#### Response fields

- `queue_item_id`
  The current queue entry id. Pass this back to `POST /api/game/song/start`, `POST /api/game/song/skip`, and `POST /api/game/song/finish`.
- `song.file_path`
  Relative song path used by the server, matching ingested `Song.filePath`
- `song.difficulty_name`
  The selected chart difficulty name
- `player`
  The active player for the current song, if known
- `user_highscore`
  Best recorded score for the current player on the current chart
- `server_highscore`
  Best recorded score for any player on the current chart, including `held_by`
- `chart_highscores`
  Per-chart highscores for every available chart on the queued song. This allows the client to update ready-screen high score display immediately when difficulty changes.
- `chart_highscores[].chart_id`
  The server chart id for that chart
- `chart_highscores[].difficulty_name`
  Normalized difficulty name for that chart
- `chart_highscores[].meter`
  Meter for that chart
- `chart_highscores[].user_highscore`
  Best recorded score for the current player on that chart
- `chart_highscores[].server_highscore`
  Best recorded score for any player on that chart, including `held_by`
- `players`
  One record per side: side 1 (the owner) always, side 2 (the joiner) when someone joined. Empty when there's no current song. Each record has `side`, `player`, the side's queued `chart_id` and `difficulty_name`, `user_highscore` and `server_highscore` on that chart, and `chart_highscores` with that player's records on every chart. The top-level `player`, `user_highscore`, `server_highscore` and `chart_highscores` stay side 1's.

#### Notes

- high scores are chart-specific, not just song-specific
- `score` is a decimal percentage, for example `100.00` or `75.23`
- `grade` is stored and returned alongside the numeric score

### `POST /api/game/song/start`

Marks the current queue song as started.

This route is idempotent for the current queue head. If the current entry is already `playing`, it still returns success.

#### Request body

```json
{
  "queue_item_id": 42,
  "chart_id": 1002
}
```

Two players:

```json
{
  "queue_item_id": 42,
  "players": [
    { "side": 1, "chart_id": 1002 },
    { "side": 2, "chart_id": 1001 }
  ]
}
```

#### Request field rules

- `queue_item_id`
  Required positive integer. It must match the current queue head or the request fails with `400` and no state change occurs.
- `chart_id`
  Side 1's chart. Required unless `players` lists side 1. It must belong to the queued song and the queued chart mode. Use one of the `chart_highscores[].chart_id` values from `GET /api/game/song/current`.
- `players`
  Optional list of the sides playing on the cabinet, each `{ "side": 1 | 2, "chart_id" }`, one per side. Side 2 is started only if someone is still joined; otherwise it's ignored. Leaving side 2 out drops the join. Once the entry is `playing`, repeat starts don't change the players.

#### Success

```json
{
  "ok": true,
  "queue_item_id": 42,
  "song": {
    "file_path": "1Arc2008 - DDR X/Butterfly",
    "chart_id": 1002,
    "difficulty_name": "Hard"
  },
  "player": {
    "id": 12,
    "display_name": "Jordan"
  },
  "user_highscore": {
    "score": 97.43,
    "grade": "AA"
  },
  "server_highscore": {
    "score": 99.12,
    "grade": "AAA",
    "held_by": "Alex"
  },
  "players": [ ... ]
}
```

`players` lists the sides that started, one record per side:

```json
{
  "side": 2,
  "player": { "id": 15, "display_name": "Sam" },
  "chart_id": 1001,
  "difficulty_name": "Easy",
  "user_highscore": { "score": 91.02, "grade": "A" },
  "server_highscore": { "score": 95.12, "grade": "A", "held_by": "Alex" }
}
```

#### Error

Invalid or mismatched `queue_item_id`:

```json
{ "error": "queue_item_id must be a positive integer" }
```

or:

```json
{ "error": "queue_item_id does not match the current queue item" }
```

or:

```json
{ "error": "chart_id must be a positive integer" }
```

or:

```json
{ "error": "chart_id does not match an available chart for the queued song and mode" }
```

Status: `400`

If no current song exists:

```json
{ "error": "No current song set" }
```

Status: `400`

### `POST /api/game/song/skip`

Skips the current song.

Current behavior:

- if a queue entry exists, it is removed and the queue advances
- no play history is recorded

#### Request body

```json
{
  "queue_item_id": 42
}
```

#### Request field rules

- `queue_item_id`
  Required positive integer. It must match the current queue head or the request fails with `400` and no state change occurs.

#### Success: queue-backed skip

```json
{
  "ok": true,
  "skipped": {
    "file_path": "1Arc2008 - DDR X/Butterfly",
    "difficulty_name": "Hard"
  },
  "next_song": {
    "queue_item_id": 43,
    "file_path": "1Arc2008 - DDR X/Paranoia",
    "difficulty_name": "Challenge"
  }
}
```

`next_song` is `null` when the queue becomes empty.

#### Error

Invalid or mismatched `queue_item_id`:

```json
{ "error": "queue_item_id must be a positive integer" }
```

or:

```json
{ "error": "queue_item_id does not match the current queue item" }
```

Status: `400`

If no current song exists:

```json
{ "error": "No current song set" }
```

Status: `400`

### `POST /api/game/song/finish`

Records a completed play and advances the queue/current-song state.

#### Request body

```json
{
  "score": 100.00,
  "grade": "AAA",
  "chart_id": 1002,
  "queue_item_id": 42
}
```

Two players (`results` replaces the top-level `score`, `grade` and `chart_id`):

```json
{
  "queue_item_id": 42,
  "results": [
    { "side": 1, "chart_id": 1002, "score": 97.43, "grade": "AA" },
    { "side": 2, "chart_id": 1001, "score": 91.02, "grade": "A" }
  ]
}
```

Optional test payload:

```json
{
  "queue_item_id": 42,
  "chart_id": 1001,
  "score": 75.23,
  "grade": "B",
  "test": true
}
```

#### Request field rules

- `score`
  Required non-negative decimal value
- `grade`
  Required non-empty string
- `chart_id`
  Required positive integer. It must belong to the queued song and the queued chart mode. Use one of the `chart_highscores[].chart_id` values from `GET /api/game/song/current`.
- `test`
  Optional boolean. When `true`, the resulting `PlayHistory` row is marked as test data
- `queue_item_id`
  Required positive integer. It must match the current queue head or the request fails with `400` and no state change occurs.
- `results`
  Optional list of results, one per side: `{ "side": 1 | 2, "chart_id", "score", "grade" }`, each following the rules above. Without it, the top-level `score`, `grade` and `chart_id` are side 1's result. A side that didn't start is skipped.

#### Success

```json
{
  "recorded": true,
  "queue_item_id": 42,
  "user_highscore": {
    "score": 97.43,
    "grade": "AA"
  },
  "server_highscore": {
    "score": 99.12,
    "grade": "AAA",
    "held_by": "Alex"
  },
  "next_song": {
    "queue_item_id": 43,
    "file_path": "1Arc2008 - DDR X/Paranoia",
    "difficulty_name": "Challenge"
  },
  "results": [ ... ]
}
```

- `results` has one record per recorded side, in the same shape as `start`'s `players`, with the records after this play.
- `user_highscore` and `server_highscore` are side 1's; `recorded` is `false` if no side was recorded.

If `queue_item_id` does not match the active queue head:

```json
{
  "error": "queue_item_id does not match the current queue item"
}
```

Status: `400`

If `chart_id` does not match an available chart for the queued song and mode:

```json
{
  "error": "chart_id does not match an available chart for the queued song and mode"
}
```

Status: `400`

#### Validation errors

Invalid score:

```json
{ "error": "score must be a non-negative decimal value" }
```

Invalid grade:

```json
{ "error": "grade must be a non-empty string" }
```

Status: `400`

Missing current song:

```json
{ "error": "No current song set" }
```

Status: `400`

### `POST /api/game/song/drop`

Drops side 2 (the player who joined) from the current song without skipping it. The cabinet uses it for P2's "Drop out" option.

#### Request body

```json
{ "queue_item_id": 42 }
```

#### Request field rules

- `queue_item_id`
  Required positive integer. It must match the current queue head or the request fails with `400` and no state change occurs.

#### Success

```json
{
  "ok": true,
  "queue_item_id": 42,
  "dropped": { "id": 15, "display_name": "Sam" }
}
```

- `dropped` is `null` when nobody was joined; the request still succeeds.
- The dropped player can join again from the web queue.

#### Errors

- `409` `{ "error": "The song has already started" }` once the entry is `playing`: the players are fixed after `start`.
- `400` for an invalid or mismatched `queue_item_id`, or when there's no current song.

### `GET /api/game/library/manifest`

Lists every pack with at least one available song, and each available song, with their checksums. Clients use it to decide which songs to download.

Implemented in [`app/api/game/library/manifest/`](../app/api/game/library/manifest/).

#### Success

```json
{
  "library_checksum": "9f2c…",
  "packs": [
    {
      "id": 1,
      "folder_name": "1Arc1998 - DDR",
      "checksum": "375f…",
      "songs": [
        { "id": 1, "folder_name": "Butterfly", "checksum": "cd6f…" }
      ]
    }
  ]
}
```

#### Response fields

- `library_checksum`
  sha256 over the listed packs and songs. Changes whenever any pack or song is added, removed, or changed.
- `packs[].checksum`
  `Pack.checksum`: the files directly in the pack folder. `null` until the pack's first ingestion.
- `packs[].songs[].folder_name`
  The song folder inside the pack, so the song's path is `<pack folder_name>/<song folder_name>`
- `packs[].songs[].checksum`
  `Song.checksum`: every file in the song folder

Packs and songs are sorted by folder name. Unavailable songs, and packs left with none, are omitted.

#### Caching

The response carries `ETag: "<library_checksum>"`. A request with a matching `If-None-Match` gets `304` with no body.

#### Error

Missing or invalid token: `401` with an empty body.

### `GET /api/game/library/songs/:songId/archive`

Downloads one available song's folder as a zip. `songId` is `packs[].songs[].id` from the manifest.

### `GET /api/game/library/packs/:packId/archive`

Downloads the files directly in a pack folder (`pack.ini`, pack banner) as a zip, without its song folders. `packId` is `packs[].id` from the manifest.

#### Archive format

Both archive routes share this format:

- `Content-Type: application/zip`, streamed with no `Content-Length`
- Entry paths are relative to the song or pack folder, so they extract straight into the client's copy of it
- Entries are stored, not compressed
- Extracted files hash to the manifest `checksum` using the recipe in [`lib/ingestion/folderChecksum.ts`](../lib/ingestion/folderChecksum.ts). A mismatch means the folder changed on disk since the last ingestion.

#### Errors

- Missing or invalid token: `401` with an empty body
- Unknown or unavailable song, unknown pack, or folder missing on disk: `404` with `{ "error": "Song not found" }` or `{ "error": "Pack not found" }`

## History and High Score Semantics

Play history is stored in `PlayHistory`.

Current behavior:

- history is chart-specific via `chartId`
- a finish event stores:
  - `songId`
  - `chartId`
  - `userId`
  - `score`
  - `grade`
  - `isTest`
  - `playedAt`
- user highscores are the highest score for the same player on the same chart
- server highscores are the highest score for any player on the same chart
- ties are broken by earliest `playedAt`

## Admin Test Surface

The admin `Test` tab can call these machine routes directly.

Current behavior:

- token may be omitted intentionally to test unauthorized responses
- admin-triggered `POST /start`, `POST /skip`, and `POST /finish` requests must include `queue_item_id`
- admin-triggered `POST /start` and `POST /finish` requests must also include `chart_id`
- admin-triggered finish requests are forced to `test: true`
- admin `History` tab can clear test-only history rows

## Limitations

- `grade` accepts any non-empty string; grades aren't validated against a fixed set
- `skip` does not write any history
- there is no separate machine heartbeat route; token `lastSeen` is updated opportunistically on authenticated machine requests
