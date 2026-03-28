# Machine API

This document describes the machine-facing HTTP API used by a cabinet or other trusted game client.

These routes are authenticated with a machine bearer token and are implemented under [`app/api/game/song/`](../../app/api/game/song/).

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
  }
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
  "difficulty_name": "Hard"
}
```

#### Request field rules

- `queue_item_id`
  Required positive integer. It must match the current queue head or the request fails with `400` and no state change occurs.
- `difficulty_name`
  Required non-empty string. This is the difficulty the client intends to play. The server normalizes common aliases like `Challenge` to `Expert` and resolves the chart against the queued song.

#### Success

```json
{
  "ok": true,
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
  }
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
{ "error": "difficulty_name must be a non-empty string" }
```

or:

```json
{ "error": "difficulty_name does not match an available chart for the queued song" }
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
  "difficulty_name": "Hard",
  "queue_item_id": 42
}
```

Optional test payload:

```json
{
  "queue_item_id": 42,
  "difficulty_name": "Easy",
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
- `difficulty_name`
  Required non-empty string. This is the difficulty actually played by the client. The server normalizes common aliases like `Challenge` to `Expert` and resolves the chart against the queued song.
- `test`
  Optional boolean. When `true`, the resulting `PlayHistory` row is marked as test data
- `queue_item_id`
  Required positive integer. It must match the current queue head or the request fails with `400` and no state change occurs.

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
  }
}
```

If `queue_item_id` does not match the active queue head:

```json
{
  "error": "queue_item_id does not match the current queue item"
}
```

Status: `400`

If `difficulty_name` does not match an available chart for the queued song:

```json
{
  "error": "difficulty_name does not match an available chart for the queued song"
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
- admin-triggered `POST /start` and `POST /finish` requests must also include the played `difficulty_name`
- admin-triggered finish requests are forced to `test: true`
- admin `History` tab can clear test-only history rows

## Current Gaps

Known limitations at the time of writing:

- `grade` accepts any non-empty string; there is no canonical grade validation yet
- `skip` does not write any history
- there is no separate machine heartbeat route; token `lastSeen` is updated opportunistically on authenticated machine requests
