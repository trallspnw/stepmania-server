# pack.ini

Each pack folder can carry a `pack.ini` describing the pack. Ingestion reads it (`lib/ingestion/ingestPacks.ts`); a missing or malformed file isn't an error, and the pack falls back to its folder name.

## Format

One `[Pack]` section; other sections and unknown keys are ignored:

```ini
[Pack]
Titles=Dance Dance Revolution SuperNova|Dancing Stage SuperNova
Platforms=Arcade|PlayStation 2
Regions=Europe|North America|Japan|Asia
EarliestRelease=2006-04-28
Source=https://en.wikipedia.org/wiki/List_of_Dance_Dance_Revolution_video_games
```

## Fields

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
- Typical uses:
  - manifest-backed ZIV category URLs for official releases
  - source site or download page for custom/community packs
  - provenance note for hand-curated or locally assembled packs

## Interpretation

- Missing optional fields should be treated as unknown, not empty.
- Ordering matters for `Titles`: the first title is the canonical display title.
- Ordering is also useful for `Platforms` and `Regions`; preserve intentional order when editing.
- INI comments may be used sparingly to capture uncertainty or release-specific notes.
