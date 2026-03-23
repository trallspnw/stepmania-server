# Metadata

This document describes the pack, song, and chart metadata model used by the project. It is intended to be portable across different song collections, not tied to a single library snapshot.

Collection-specific audit numbers, if needed, should live in generated analysis outputs or task-specific notes rather than in this durable reference.

## Pack Metadata

Pack metadata is stored in a standard INI section:

```ini
[Pack]
Titles=Dance Dance Revolution SuperNova|Dancing Stage SuperNova
Platforms=Arcade|PlayStation 2
Regions=Europe|North America|Japan|Asia
EarliestRelease=2006-04-28
Source=https://en.wikipedia.org/wiki/List_of_Dance_Dance_Revolution_video_games
```

### Fields

`Titles`

- Required.
- Pipe-delimited list of known pack titles.
- The first title is the preferred/default display title for UX.
- Additional titles may be alternate regional names, branding variants, or closely related release names that help users identify the pack.

`Platforms`

- Optional.
- Pipe-delimited list of platforms the pack was released on.
- Examples: `Arcade`, `PlayStation`, `PlayStation 2`, `Dreamcast`, `GameCube`, `Wii`, `Xbox 360`.
- For non-commercial packs, values such as `Custom`, `Community`, `Compilation`, or `Miscellaneous` may be used when they better describe the pack source/type than a hardware platform.

`Regions`

- Optional.
- Pipe-delimited list of countries or broad release regions where the pack had an official release.
- Examples: `Japan`, `Korea`, `Asia`, `Europe`, `North America`, `South America`, `Oceania`.
- Typically used for official packs only.

`EarliestRelease`

- Optional.
- Date of the earliest known release of the pack in `YYYY-MM-DD` format.
- Primarily useful for official packs.
- If only an approximate date is known, an INI comment should explain that.

`Source`

- Optional.
- Describes where the pack metadata or files came from.
- This can be a URL or a short provenance note, depending on what is most useful.
- In the current library, this is expected for nearly all packs.
- Typical uses:
  - manifest-backed ZIV category URLs for official releases
  - source site or download page for custom/community packs
  - provenance note for hand-curated or locally assembled packs

### Interpretation Notes

- Missing optional fields should be treated as unknown, not empty.
- Ordering matters for `Titles`: the first title is the canonical display title.
- Ordering is also useful for `Platforms` and `Regions`; preserve intentional order when editing.
- INI comments may be used sparingly to capture uncertainty or release-specific notes.

### Pack Card Mapping

For compact pack-list UX, the raw metadata may be reduced to a small display summary.

Recommended display fields:

- title
- song count
- one preferred platform label
- release year
- compact region emoji set

Platform preference:

- if `Arcade` is present, display `Arcade`
- otherwise if any Nintendo platform is present, display `Nintendo Systems`
- otherwise if any PlayStation platform is present, display `PlayStation Systems`
- otherwise fall back to the first listed platform

Nintendo platforms for this rule:

- `Game Boy Color`
- `Nintendo 64`
- `GameCube`
- `Wii`

PlayStation platforms for this rule:

- `PlayStation`
- `PlayStation 2`

Release year mapping:

- derive from the first four digits of `EarliestRelease`
- if no release date is available, display `-`

Region emoji mapping:

- `Japan` → `🇯🇵`
- `Korea` → `🇰🇷`
- `Asia` → `🌏`
- `Europe` → `🇪🇺`
- `North America` → `🇺🇸`
- `South America` → `🌎`
- `Oceania` → `🌊`

Region collapse rule:

- if a larger region is present, suppress contained country-specific entries in the compact display
- current example: if `Asia` is present, suppress `Japan` and `Korea`
- display multiple regions when multiple broad release regions apply

## Song Metadata

Song metadata is read from simfile headers. The analysis scripts support both major chart container styles commonly found in StepMania content:

- `.sm` `#NOTES:` blocks
- `.ssc` `#NOTEDATA` chart blocks with `#STEPSTYPE`, `#DIFFICULTY`, `#METER`, `#CREDIT`, and multiline `#NOTES`

### Song-Level Fields

These are the song-level fields currently analyzed because they are the most relevant to DB ingestion and UX rendering:

- `TITLE`
- `TITLETRANSLIT`
- `ARTIST`
- `ARTISTTRANSLIT`
- `GENRE`
- `CREDIT`
- `DISPLAYBPM`
- `BPMS`
- `OFFSET`
- `SAMPLESTART`
- `SAMPLELENGTH`
- `SELECTABLE`

#### `TITLE`

- Expected use: primary song display title
- Guidance: treat as effectively required for ingestion

#### `TITLETRANSLIT`

- Expected use: transliterated title for search and display fallback
- Guidance: optional and often sparse

#### `ARTIST`

- Expected use: primary artist display field
- Guidance: high-value field for ingestion, but still optional in practice

#### `ARTISTTRANSLIT`

- Expected use: transliterated artist for search and display fallback
- Guidance: optional and often sparse

#### `GENRE`

- Expected use: optional categorization or filtering aid
- Guidance: do not assume high coverage
- In practice, libraries often do not have a reliable fallback field for missing genre values

#### `CREDIT`

- Expected use: song-level credit or attribution field
- Guidance: often more useful in custom/community content than in official releases

#### `DISPLAYBPM`

- Expected use: display-oriented BPM hint
- Guidance: optional display metadata only

#### `BPMS`

- Expected use: source of truth for tempo data
- Guidance: prefer this over `DISPLAYBPM` for actual timing/BPM logic

#### `OFFSET`

- Expected use: timing offset for song playback/chart sync
- Guidance: preserve when available, but do not assume universal coverage

#### `SAMPLESTART`

- Expected use: preview playback start point
- Guidance: useful for UX when present

#### `SAMPLELENGTH`

- Expected use: preview playback duration
- Guidance: useful for UX when present

#### `SELECTABLE`

- Expected use: selection eligibility flag
- Guidance: optional and often inconsistently populated across libraries

### Song-Level Abnormalities

- Expect occasional formatting differences between paired `.sm` and `.ssc` files.
- Expect some numeric fields to contain malformed values in community/custom content.
- Expect sparse optional fields such as `GENRE`, `TITLETRANSLIT`, `ARTISTTRANSLIT`, `CREDIT`, and `DISPLAYBPM`.

## Chart Metadata

These are the chart-level fields currently analyzed from both `.sm` and `.ssc` chart blocks:

- `game_mode`
- `difficulty_slot`
- `meter`
- `author`

#### `game_mode`

- Expected use: chart mode / ruleset identifier
- Guidance: do not assume a DDR-only set; custom collections may contain many modes

#### `difficulty_slot`

- Expected use: user-facing difficulty bucket
- Guidance: normalize cautiously; libraries may contain case variants or alternate names

#### `meter`

- Expected use: numeric difficulty level
- Guidance: store as numeric where possible, but anticipate malformed community data

#### `author`

- Expected use: chart attribution / step author
- Guidance: optional, but valuable in custom/community content

### Difficulty Slot Inventory

Recommended baseline canonical set:

- `Beginner`
- `Easy`
- `Medium`
- `Hard`
- `Challenge`
- `Edit`

Guidance:

- keep analysis capable of reporting the full raw slot inventory
- do not assume `Oni`, `Expert`, or other variants are absent in future libraries
- expect custom packs to introduce casing or naming inconsistencies

## Ingestion Decisions

Placeholder only for now.

- simfile precedence: prefer `.ssc` over `.sm` when both exist for the same song
- canonical field mapping: TBD
- difficulty slot normalization rules: TBD
- transliteration fallback rules: TBD
- BPM/display BPM storage strategy: TBD
- chart author storage and display strategy: TBD

## Analysis Outputs

The scratch analysis scripts write collection-specific outputs to:

- `scratch/output/report.json`
- `scratch/output/report.txt`
- `scratch/output/unparseable.txt`

Those generated files are the right place for concrete counts, distributions, and anomalies for a specific library snapshot.
