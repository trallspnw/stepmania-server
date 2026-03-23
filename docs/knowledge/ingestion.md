# Ingestion

This document describes the database structures and ingestion methodology currently implemented for the StepMania library.

It is intentionally focused on durable design and execution behavior, not on a specific library snapshot.

## Current Scope

The ingestion pipeline is being built in phases.

Current status:

- `Pack` ingestion is implemented
- `Song` ingestion is planned next
- `Chart` ingestion is planned after song ingestion
- `PlayHistory` exists in the schema but is not part of library ingestion

## Database Structures

The current library-facing Prisma models are:

- `Pack`
- `Song`
- `Chart`
- `PlayHistory`

### Pack

`Pack` represents one top-level folder under the songs root.

Primary fields:

- `folderName`: unique folder identifier on disk
- `sortIndex`: leading category prefix derived from the folder name, such as `1Arc`, `5Wii`, or `9Custom`
- `titles`: pipe-delimited pack title list; first title is the display title
- `platforms`: pipe-delimited platform list
- `regions`: pipe-delimited region list
- `earliestRelease`: string date in `YYYY-MM-DD` form
- `source`: provenance or source URL
- `isCustom`: derived from `9*` folder prefixes
- `isCommunity`: derived from `8*` folder prefixes

Design notes:

- `titles`, `platforms`, and `regions` are stored exactly as pipe-delimited strings rather than normalized child tables.
- `earliestRelease` is stored as a string rather than a strict date because the source data may be approximate.
- `Pack` records are not deleted automatically when folders disappear from disk.

### Song

`Song` will represent one song directory relative to a pack.

Primary fields:

- `packId`: parent pack
- `title`, `titleTranslit`
- `artist`, `artistTranslit`
- `genre`
- `credit`
- `displayBpm`
- `bpmMin`, `bpmMax`
- `offset`
- `sampleStart`, `sampleLength`
- `filePath`: unique relative path such as `Pack Name/Song Title`
- `simfileType`: chosen source file type, expected to be `ssc` or `sm`
- `checksum`: content hash used to detect change
- `available`
- `ingestFlags`: pipe-delimited ingest warnings or status flags
- `lastScanned`

Design notes:

- `Song` is the canonical ingestion unit for one song folder.
- The planned precedence rule is: prefer `.ssc` over `.sm` when both are present.
- `filePath` is the operational uniqueness key for ingestion.

### Chart

`Chart` will represent one playable chart extracted from the chosen simfile.

Primary fields:

- `songId`: parent song
- `gameMode`
- `difficultySlot`
- `meter`
- `author`
- `isPrimary`

Design notes:

- `isPrimary` is intended to mark `dance-single` charts at ingest time.
- The current uniqueness constraint is `@@unique([songId, gameMode, difficultySlot])`.
- If duplicate chart slots are encountered during ingestion, the intended behavior is to keep the first and surface an ingest flag rather than fail the run.

### PlayHistory

`PlayHistory` is not part of filesystem ingestion, but it constrains cleanup behavior.

Primary fields:

- `songId`
- `userId`
- `score`
- `grade`
- `playedAt`

Design note:

- Because songs may accumulate play history, ingestion avoids destructive deletes and favors reconciliation plus warnings.

## Implemented Methodology

### Pack Ingestion

The current pack ingestion entrypoint is:

- [`lib/ingestion/ingestPacks.ts`](/home/thomas/projects/stepmania-server/lib/ingestion/ingestPacks.ts)

Behavior:

1. Scan the top-level directories under `SONGS_DIR` or `.data/Songs`.
2. Treat each directory as one candidate pack.
3. Read `pack.ini` when present.
4. Parse only the `[Pack]` section and only recognized keys.
5. Derive structural fields from the folder name.
6. Upsert by `folderName`.
7. Update only when a field actually changed.
8. Log packs that exist in the database but no longer exist on disk.

Properties:

- idempotent
- filesystem-driven
- non-destructive
- callable independently of HTTP

### pack.ini Handling

Pack ingestion uses plain Node filesystem and string parsing.

Rules:

- missing `pack.ini` is not fatal
- malformed `pack.ini` is not fatal
- comment lines beginning with `;` are ignored
- only the `[Pack]` section is considered
- unrecognized keys are ignored
- inline comments are stripped from `EarliestRelease`

If `pack.ini` cannot be used:

- the pack is still ingested
- `folderName` is preserved
- optional metadata fields remain null
- `titles` falls back to the folder name because the database currently requires it

### HTTP Trigger

The current admin ingestion API is:

- `POST /api/admin/ingestion`
- `GET /api/admin/ingestion`

Behavior:

- both endpoints require an authenticated admin session
- `POST` starts a background ingestion run and immediately acknowledges the request
- `GET` returns the current or most recent ingestion status and results
- the current run executes pack ingestion first and reserves a songs stage for the next implementation step
- `SONGS_DIR` is resolved from environment, defaulting to `.data/Songs`

The current admin UI surface is in:

- [`components/admin-console.tsx`](/home/thomas/projects/stepmania-server/components/admin-console.tsx)

### Current Runtime Limitation

The current async ingestion status store is in-memory inside the app process.

Implications:

- status is lost on server restart
- this is suitable for the current single-instance local/admin workflow
- this is not yet a durable multi-instance job system

## Working Assumptions

- The filesystem is the source of truth for what packs currently exist.
- Pack metadata is optional, but pack presence on disk is not.
- Ingestion should prefer reconciliation over deletion.
- Library ingestion code should remain callable without an HTTP request so it can later be used by scheduled jobs or other admin workflows.
- `.ssc` is the preferred source when both `.ssc` and `.sm` exist for the same song.

## Next Steps

The next ingestion phases are expected to be:

1. Song ingestion
2. Chart ingestion
3. Ingest flag population during song and chart parsing
4. Possible background-job or queued execution once ingestion becomes longer-running
