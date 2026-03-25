"use client";

import {
  CSSProperties,
  KeyboardEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  FilterIcon,
  FolderIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from "@/components/icons";
import { useApp } from "@/lib/app-context";
import {
  BrowseArtistRecord,
  BrowseArtistsResponse,
  BrowseDifficulty,
  BrowsePackRecord,
  BrowsePacksResponse,
  BrowseSongRecord,
  BrowseSongsResponse,
  getDifficultyGradient,
  getDifficultyRange,
  getDifficultyTone,
  getPackRegionEmojis,
  getPreferredPlatform,
  getReleaseYear,
  hasCustomDifficulty,
} from "@/lib/library-browser";
import { getLibraryGameModeLabel } from "@/lib/library-mode";

type BrowseMode = "search" | "packs" | "artists";
type FolderView =
  | { type: "pack"; packId: number; value: string }
  | { type: "artist"; value: string }
  | null;

interface Filters {
  minDifficulty: number | null;
  maxDifficulty: number | null;
  minBpm: number | null;
  maxBpm: number | null;
}

interface FilterInputs {
  minDifficulty: string;
  maxDifficulty: string;
  minBpm: string;
  maxBpm: string;
}

const defaultFilters: Filters = {
  minDifficulty: null,
  maxDifficulty: null,
  minBpm: null,
  maxBpm: null,
};

const defaultFilterInputs: FilterInputs = {
  minDifficulty: "",
  maxDifficulty: "",
  minBpm: "",
  maxBpm: "",
};

function appendUniqueBy<T>(current: T[], incoming: T[], getKey: (item: T) => string | number) {
  const seen = new Set(current.map((item) => getKey(item)));
  const next = [...current];

  for (const item of incoming) {
    const key = getKey(item);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(item);
  }

  return next;
}

function clampFilterValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseFilterInput(
  rawValue: string,
  min: number,
  max: number,
) {
  if (rawValue.trim() === "") {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clampFilterValue(parsed, min, max);
}

function currentMinDifficultyLimit(filters: Filters, bounds: Filters) {
  return bounds.minDifficulty ?? 1;
}

function currentMaxDifficultyLimit(filters: Filters, bounds: Filters) {
  return bounds.maxDifficulty ?? 25;
}

function currentMinBpmLimit(filters: Filters, bounds: Filters) {
  return bounds.minBpm ?? 100;
}

function currentMaxBpmLimit(filters: Filters, bounds: Filters) {
  return bounds.maxBpm ?? 450;
}

function filtersToInputs(filters: Filters): FilterInputs {
  return {
    minDifficulty: filters.minDifficulty == null ? "" : String(filters.minDifficulty),
    maxDifficulty: filters.maxDifficulty == null ? "" : String(filters.maxDifficulty),
    minBpm: filters.minBpm == null ? "" : String(filters.minBpm),
    maxBpm: filters.maxBpm == null ? "" : String(filters.maxBpm),
  };
}

export function BrowseScreen() {
  const { addToQueue } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedSong, setSelectedSong] = useState<BrowseSongRecord | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<BrowseDifficulty | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [selectedSongBannerSrc, setSelectedSongBannerSrc] = useState<string | null>(null);
  const [browseMode, setBrowseMode] = useState<BrowseMode>("search");
  const [folderView, setFolderView] = useState<FolderView>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [filterInputs, setFilterInputs] = useState<FilterInputs>(defaultFilterInputs);
  const [filterBounds, setFilterBounds] = useState<Filters>(defaultFilters);
  const [shouldResetFilters, setShouldResetFilters] = useState(true);

  const [songs, setSongs] = useState<BrowseSongRecord[]>([]);
  const [songsPage, setSongsPage] = useState(1);
  const [songsTotal, setSongsTotal] = useState(0);
  const [songsTotalPages, setSongsTotalPages] = useState(1);
  const [songsLoading, setSongsLoading] = useState(false);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [activeGameMode, setActiveGameMode] = useState("dance-single");

  const [packs, setPacks] = useState<BrowsePackRecord[]>([]);
  const [packsPage, setPacksPage] = useState(1);
  const [packsTotal, setPacksTotal] = useState(0);
  const [packsTotalPages, setPacksTotalPages] = useState(1);
  const [packsLoading, setPacksLoading] = useState(false);
  const [packsError, setPacksError] = useState<string | null>(null);

  const [artists, setArtists] = useState<BrowseArtistRecord[]>([]);
  const [artistsPage, setArtistsPage] = useState(1);
  const [artistsTotal, setArtistsTotal] = useState(0);
  const [artistsTotalPages, setArtistsTotalPages] = useState(1);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [artistsError, setArtistsError] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = window.setTimeout(() => {
      setJustAdded(null);
      setSelectedSong(null);
      setSelectedDifficulty(null);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [justAdded]);

  useEffect(() => {
    if (!selectedSong) {
      setSelectedSongBannerSrc((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const selectedSongId = selectedSong.id;

    async function loadBanner() {
      try {
        const response = await fetch(`/api/library/browse/songs/${selectedSongId}/banner`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled) {
            setSelectedSongBannerSrc((current) => {
              if (current) {
                URL.revokeObjectURL(current);
              }
              return null;
            });
          }
          return;
        }

        const bannerBlob = await response.blob();
        objectUrl = URL.createObjectURL(bannerBlob);

        if (!cancelled) {
          setSelectedSongBannerSrc((current) => {
            if (current) {
              URL.revokeObjectURL(current);
            }
            return objectUrl;
          });
        }
      } catch {
        if (!cancelled) {
          setSelectedSongBannerSrc((current) => {
            if (current) {
              URL.revokeObjectURL(current);
            }
            return null;
          });
        }
      }
    }

    void loadBanner();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedSong]);

  useEffect(() => {
    if (!filtersOpen) {
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (filtersRef.current?.contains(target)) {
        return;
      }

      setFiltersOpen(false);
    }

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [filtersOpen]);

  useEffect(() => {
    setFilterInputs(filtersToInputs(filters));
  }, [filters]);

  const hasActiveFilters =
    filters.minDifficulty != null ||
    filters.maxDifficulty != null ||
    filters.minBpm != null ||
    filters.maxBpm != null;

  const songsModeActive = browseMode === "search" || folderView !== null;

  const browseContextKey = useMemo(
    () =>
      JSON.stringify({
        query: browseMode === "search" ? deferredSearch.trim() : "",
        folderView,
        browseMode,
      }),
    [browseMode, deferredSearch, folderView],
  );

  const songQueryKey = useMemo(
    () =>
      JSON.stringify({
        browseContextKey,
        filters,
      }),
    [browseContextKey, filters],
  );

  useEffect(() => {
    if (!songsModeActive) {
      return;
    }

    setSongs([]);
    setSongsPage(1);
    setSongsTotal(0);
    setSongsTotalPages(1);
    setSongsError(null);
  }, [songQueryKey, songsModeActive]);

  useEffect(() => {
    if (!songsModeActive) {
      return;
    }

    setShouldResetFilters(true);
  }, [browseContextKey, songsModeActive]);

  useEffect(() => {
    if (!songsModeActive) {
      return;
    }

    const searchParams = new URLSearchParams({
      page: String(songsPage),
    });

    if (filters.minDifficulty != null) {
      searchParams.set("minDifficulty", String(filters.minDifficulty));
    }

    if (filters.maxDifficulty != null) {
      searchParams.set("maxDifficulty", String(filters.maxDifficulty));
    }

    if (filters.minBpm != null) {
      searchParams.set("minBpm", String(filters.minBpm));
    }

    if (filters.maxBpm != null) {
      searchParams.set("maxBpm", String(filters.maxBpm));
    }

    if (browseMode === "search" && deferredSearch.trim()) {
      searchParams.set("query", deferredSearch.trim());
    }

    if (folderView?.type === "pack") {
      searchParams.set("packId", String(folderView.packId));
    }

    if (folderView?.type === "artist") {
      searchParams.set("artist", folderView.value);
    }

    let cancelled = false;

    async function loadSongs() {
      try {
        setSongsLoading(true);

        const response = await fetch(`/api/library/browse/songs?${searchParams.toString()}`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as BrowseSongsResponse;

        if (cancelled) {
          return;
        }

        setSongsTotal(data.total);
        setSongsTotalPages(data.totalPages);
        setActiveGameMode(data.gameMode);
        setFilterBounds(data.filterBounds);
        if (shouldResetFilters) {
          setFilters(defaultFilters);
          setShouldResetFilters(false);
        }
        setSongs((current) =>
          songsPage === 1 ? data.songs : appendUniqueBy(current, data.songs, (song) => song.id),
        );
      } catch (error) {
        if (!cancelled) {
          setSongsError((error as Error).message);
        }
      } finally {
        if (!cancelled) {
          setSongsLoading(false);
        }
      }
    }

    void loadSongs();

    return () => {
      cancelled = true;
    };
  }, [
    browseMode,
    deferredSearch,
    filters,
    folderView,
    browseContextKey,
    songQueryKey,
    songsModeActive,
    songsPage,
    shouldResetFilters,
  ]);

  useEffect(() => {
    if (folderView || browseMode !== "packs") {
      return;
    }

    setPacks([]);
    setPacksPage(1);
    setPacksTotal(0);
    setPacksTotalPages(1);
    setPacksError(null);
  }, [browseMode, folderView]);

  useEffect(() => {
    if (folderView || browseMode !== "packs") {
      return;
    }

    let cancelled = false;

    async function loadPacks() {
      try {
        setPacksLoading(true);

        const response = await fetch(`/api/library/browse/packs?page=${packsPage}`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as BrowsePacksResponse;

        if (cancelled) {
          return;
        }

        setPacksTotal(data.total);
        setPacksTotalPages(data.totalPages);
        setActiveGameMode(data.gameMode);
        setPacks((current) =>
          packsPage === 1 ? data.packs : appendUniqueBy(current, data.packs, (pack) => pack.id),
        );
      } catch (error) {
        if (!cancelled) {
          setPacksError((error as Error).message);
        }
      } finally {
        if (!cancelled) {
          setPacksLoading(false);
        }
      }
    }

    void loadPacks();

    return () => {
      cancelled = true;
    };
  }, [browseMode, folderView, packsPage]);

  useEffect(() => {
    if (folderView || browseMode !== "artists") {
      return;
    }

    setArtists([]);
    setArtistsPage(1);
    setArtistsTotal(0);
    setArtistsTotalPages(1);
    setArtistsError(null);
  }, [browseMode, folderView]);

  useEffect(() => {
    if (folderView || browseMode !== "artists") {
      return;
    }

    let cancelled = false;

    async function loadArtists() {
      try {
        setArtistsLoading(true);

        const response = await fetch(`/api/library/browse/artists?page=${artistsPage}`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as BrowseArtistsResponse;

        if (cancelled) {
          return;
        }

        setArtistsTotal(data.total);
        setArtistsTotalPages(data.totalPages);
        setActiveGameMode(data.gameMode);
        setArtists((current) =>
          artistsPage === 1
            ? data.artists
            : appendUniqueBy(current, data.artists, (artist) => artist.name),
        );
      } catch (error) {
        if (!cancelled) {
          setArtistsError((error as Error).message);
        }
      } finally {
        if (!cancelled) {
          setArtistsLoading(false);
        }
      }
    }

    void loadArtists();

    return () => {
      cancelled = true;
    };
  }, [artistsPage, browseMode, folderView]);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting) {
          return;
        }

        if (songsModeActive) {
          if (!songsLoading && songsPage < songsTotalPages) {
            setSongsPage((current) => current + 1);
          }
          return;
        }

        if (browseMode === "packs") {
          if (!packsLoading && packsPage < packsTotalPages) {
            setPacksPage((current) => current + 1);
          }
          return;
        }

        if (browseMode === "artists" && !artistsLoading && artistsPage < artistsTotalPages) {
          setArtistsPage((current) => current + 1);
        }
      },
      {
        rootMargin: "220px 0px",
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [
    artistsLoading,
    artistsPage,
    artistsTotalPages,
    browseMode,
    packsLoading,
    packsPage,
    packsTotalPages,
    songsLoading,
    songsModeActive,
    songsPage,
    songsTotalPages,
  ]);

  function openSong(song: BrowseSongRecord) {
    setSelectedSong(song);
    setSelectedDifficulty(song.difficulties[0] ?? null);
  }

  function addSelectedSong() {
    if (!selectedSong || !selectedDifficulty) return;

    addToQueue(selectedSong.id, selectedDifficulty, {
      title: selectedSong.title,
      artist: selectedSong.artist,
    });

    setJustAdded(selectedSong.id);
  }

  function commitFilterField(field: keyof Filters) {
    setFilters((current) => {
      switch (field) {
        case "minDifficulty":
          return {
            ...current,
            minDifficulty: parseFilterInput(
              filterInputs.minDifficulty,
              currentMinDifficultyLimit(current, filterBounds),
              currentMaxDifficultyLimit(current, filterBounds),
            ),
          };
        case "maxDifficulty":
          return {
            ...current,
            maxDifficulty: parseFilterInput(
              filterInputs.maxDifficulty,
              currentMinDifficultyLimit(current, filterBounds),
              currentMaxDifficultyLimit(current, filterBounds),
            ),
          };
        case "minBpm":
          return {
            ...current,
            minBpm: parseFilterInput(
              filterInputs.minBpm,
              currentMinBpmLimit(current, filterBounds),
              currentMaxBpmLimit(current, filterBounds),
            ),
          };
        case "maxBpm":
          return {
            ...current,
            maxBpm: parseFilterInput(
              filterInputs.maxBpm,
              currentMinBpmLimit(current, filterBounds),
              currentMaxBpmLimit(current, filterBounds),
            ),
          };
      }
    });
  }

  function handleFilterKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    field: keyof Filters,
  ) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      commitFilterField(field);
    }
  }

  const currentListTotal = songsModeActive
    ? songsTotal
    : browseMode === "packs"
      ? packsTotal
      : artistsTotal;

  const currentHasMore = songsModeActive
    ? songsPage < songsTotalPages
    : browseMode === "packs"
      ? packsPage < packsTotalPages
      : artistsPage < artistsTotalPages;

  const currentLoading = songsModeActive
    ? songsLoading
    : browseMode === "packs"
      ? packsLoading
      : artistsLoading;

  const currentError = songsModeActive
    ? songsError
    : browseMode === "packs"
      ? packsError
      : artistsError;

  return (
    <div className="stack browseStack">
      {folderView ? (
        <div className="toolbar">
          <button
            className="iconButton"
            onClick={() => setFolderView(null)}
            type="button"
          >
            <ArrowLeftIcon className="tinyIcon" />
          </button>
          <div className="toolbarCopy">
            <h2>{folderView.value}</h2>
            <p>
              {songsTotal} songs · Mode: {getLibraryGameModeLabel(activeGameMode)}
            </p>
          </div>
          <button
            className={`iconButton${hasActiveFilters ? " isSelected" : ""}`}
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            <FilterIcon className="tinyIcon" />
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar segmentedToolbar">
            <div className="segmentGroup">
              <button
                className={`segmentButton${browseMode === "search" ? " isSelected" : ""}`}
                onClick={() => setBrowseMode("search")}
                type="button"
              >
                <SearchIcon className="tinyIcon" />
                <span>Search</span>
              </button>
              <button
                className={`segmentButton${browseMode === "packs" ? " isSelected" : ""}`}
                onClick={() => setBrowseMode("packs")}
                type="button"
              >
                <FolderIcon className="tinyIcon" />
                <span>Packs</span>
              </button>
              <button
                className={`segmentButton${browseMode === "artists" ? " isSelected" : ""}`}
                onClick={() => setBrowseMode("artists")}
                type="button"
              >
                <UserIcon className="tinyIcon" />
                <span>Artists</span>
              </button>
            </div>
            <button
              className={`iconButton${hasActiveFilters ? " isSelected" : ""}`}
              onClick={() => setFiltersOpen((open) => !open)}
              type="button"
            >
              <FilterIcon className="tinyIcon" />
            </button>
          </div>

          {browseMode === "search" ? (
            <label className="searchField">
              <SearchIcon className="tinyIcon" />
              <input
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search songs, artists, or packs..."
                value={searchQuery}
              />
            </label>
          ) : null}

          <div className="browseModeMeta muted">Mode: {getLibraryGameModeLabel(activeGameMode)}</div>
        </>
      )}

      {filtersOpen ? (
        <div className="filterOverlay" aria-hidden="true">
          <div className="filterOverlayScrim" />
          <section className="card filterCard" ref={filtersRef}>
            <div className="splitRow filterHeader">
              <h3>Filters</h3>
              {hasActiveFilters ? (
                <button
                  className="textButton"
                  onClick={() => setFilters(defaultFilters)}
                  type="button"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="filterGroup">
              <div className="splitRow">
                <span>Difficulty Range</span>
                <span className="muted">
                  {filters.minDifficulty ?? "Any"} - {filters.maxDifficulty ?? "Any"}
                </span>
              </div>
              <div className="rangeGrid">
                <label>
                  <span className="inputLabel">Min</span>
                  <input
                    inputMode="numeric"
                    max={currentMaxDifficultyLimit(filters, filterBounds)}
                    min={currentMinDifficultyLimit(filters, filterBounds)}
                    onBlur={() => commitFilterField("minDifficulty")}
                    onChange={(event) =>
                      setFilterInputs((current) => ({
                        ...current,
                        minDifficulty: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => handleFilterKeyDown(event, "minDifficulty")}
                    placeholder={String(currentMinDifficultyLimit(filters, filterBounds))}
                    type="number"
                    value={filterInputs.minDifficulty}
                  />
                </label>
                <label>
                  <span className="inputLabel">Max</span>
                  <input
                    inputMode="numeric"
                    max={currentMaxDifficultyLimit(filters, filterBounds)}
                    min={currentMinDifficultyLimit(filters, filterBounds)}
                    onBlur={() => commitFilterField("maxDifficulty")}
                    onChange={(event) =>
                      setFilterInputs((current) => ({
                        ...current,
                        maxDifficulty: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => handleFilterKeyDown(event, "maxDifficulty")}
                    placeholder={String(currentMaxDifficultyLimit(filters, filterBounds))}
                    type="number"
                    value={filterInputs.maxDifficulty}
                  />
                </label>
              </div>
            </div>

            <div className="filterGroup">
              <div className="splitRow">
                <span>BPM Range</span>
                <span className="muted">
                  {filters.minBpm ?? "Any"} - {filters.maxBpm ?? "Any"}
                </span>
              </div>
              <div className="rangeGrid">
                <label>
                  <span className="inputLabel">Min</span>
                  <input
                    inputMode="numeric"
                    max={currentMaxBpmLimit(filters, filterBounds)}
                    min={currentMinBpmLimit(filters, filterBounds)}
                    onBlur={() => commitFilterField("minBpm")}
                    onChange={(event) =>
                      setFilterInputs((current) => ({
                        ...current,
                        minBpm: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => handleFilterKeyDown(event, "minBpm")}
                    placeholder={String(currentMinBpmLimit(filters, filterBounds))}
                    step={1}
                    type="number"
                    value={filterInputs.minBpm}
                  />
                </label>
                <label>
                  <span className="inputLabel">Max</span>
                  <input
                    inputMode="numeric"
                    max={currentMaxBpmLimit(filters, filterBounds)}
                    min={currentMinBpmLimit(filters, filterBounds)}
                    onBlur={() => commitFilterField("maxBpm")}
                    onChange={(event) =>
                      setFilterInputs((current) => ({
                        ...current,
                        maxBpm: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => handleFilterKeyDown(event, "maxBpm")}
                    placeholder={String(currentMaxBpmLimit(filters, filterBounds))}
                    step={1}
                    type="number"
                    value={filterInputs.maxBpm}
                  />
                </label>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {songsModeActive ? (
        <div className="stack tight">
          {songsError ? <div className="card emptyInline">{songsError}</div> : null}
          {!songsError && songs.length === 0 && !songsLoading ? (
            <div className="card emptyInline">No songs found</div>
          ) : null}
          {songs.map((song) => {
            const { min, max } = getDifficultyRange(song);
            const hasCustom = hasCustomDifficulty(song);
            return (
              <button
                className="card songCard"
                key={song.id}
                onClick={() => openSong(song)}
                style={
                  {
                    "--song-difficulty-gradient": getDifficultyGradient(song),
                  } as CSSProperties
                }
                type="button"
              >
                <div className="songCardCopy">
                  <h3>{song.title}</h3>
                  <p>{song.artist}</p>
                  <div className="metaRow wrap songMetaRow muted">
                    <span className="songPackLabel">{song.pack}</span>
                    <span>{song.difficulties.length} charts</span>
                    {hasCustom ? <span className="songMetaBadge">Custom</span> : null}
                  </div>
                </div>
                <div className="songCardAside">
                  <span className="softPill songRangePill">
                    {min === max ? min : `${min}-${max}`}
                  </span>
                  {song.bpmLabel ? <span className="songBpmChip">{song.bpmLabel} BPM</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="stack tight">
          {currentError ? <div className="card emptyInline">{currentError}</div> : null}
          {!currentError && browseMode === "packs" && packs.length === 0 && !packsLoading ? (
            <div className="card emptyInline">No packs found</div>
          ) : null}
          {!currentError && browseMode === "artists" && artists.length === 0 && !artistsLoading ? (
            <div className="card emptyInline">No artists found</div>
          ) : null}
          {browseMode === "packs"
            ? packs.map((pack) => (
                <button
                  className="folderRow"
                  key={pack.id}
                  onClick={() =>
                    setFolderView({
                      type: "pack",
                      packId: pack.id,
                      value: pack.title,
                    })
                  }
                  type="button"
                >
                  <div className="folderIconWrap">
                    <FolderIcon className="tinyIcon" />
                  </div>
                  <div className="folderCopy">
                    <h3>{pack.title}</h3>
                    <div className="metaRow wrap muted">
                      <span>{pack.songCount} songs</span>
                      {getPreferredPlatform(pack.platforms) ? (
                        <span>{getPreferredPlatform(pack.platforms)}</span>
                      ) : null}
                      {getReleaseYear(pack.earliestRelease) ? (
                        <span>{getReleaseYear(pack.earliestRelease)}</span>
                      ) : null}
                      {getPackRegionEmojis(pack.regions) ? (
                        <span className="regionEmojiRow">{getPackRegionEmojis(pack.regions)}</span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRightIcon className="tinyIcon mutedIcon" />
                </button>
              ))
            : artists.map((artist) => (
                <button
                  className="folderRow"
                  key={artist.name}
                  onClick={() =>
                    setFolderView({
                      type: "artist",
                      value: artist.name,
                    })
                  }
                  type="button"
                >
                  <div className="folderIconWrap">
                    <UserIcon className="tinyIcon" />
                  </div>
                  <div className="folderCopy">
                    <h3>{artist.name}</h3>
                    <p>{artist.songCount} songs</p>
                  </div>
                  <ChevronRightIcon className="tinyIcon mutedIcon" />
                </button>
              ))}
        </div>
      )}

      {(currentLoading || currentHasMore) && !currentError ? (
        <div className="loadMoreStatus" ref={loadMoreRef}>
          {currentLoading
            ? `Loading ${songsModeActive ? "songs" : browseMode}...`
            : currentListTotal > 0
              ? "Scroll for more"
              : ""}
        </div>
      ) : null}

      {selectedSong ? (
        <>
          <button
            aria-label="Close song details"
            className="sheetBackdrop"
            onClick={() => {
              setSelectedSong(null);
              setSelectedDifficulty(null);
            }}
            type="button"
          />
          <section className="sheet">
            <div className="sheetHandle" />
            {selectedSongBannerSrc ? (
              <div className="sheetBannerFrame">
                <img
                  alt={`${selectedSong.title} banner`}
                  className="sheetBannerImage"
                  src={selectedSongBannerSrc}
                />
              </div>
            ) : null}
            <header className="sheetHeader">
              <div>
                <h2>{selectedSong.title}</h2>
                <p>{selectedSong.artist}</p>
              </div>
            </header>

            <div className="sheetMetaGrid">
              <div>
                <span className="inputLabel">Pack</span>
                <strong>{selectedSong.pack}</strong>
              </div>
              <div>
                <span className="inputLabel">BPM</span>
                <strong>{selectedSong.bpmLabel || "-"}</strong>
              </div>
            </div>

            <div className="stack tight">
              <span className="inputLabel">Select Difficulty</span>
              <div className="difficultyGrid">
                {selectedSong.difficulties.map((difficulty, index) => (
                  <button
                    className={`pill difficultyButton ${getDifficultyTone(difficulty.slot)}${
                      selectedDifficulty?.slot === difficulty.slot &&
                      selectedDifficulty?.level === difficulty.level
                        ? " isSelected"
                        : ""
                    }`}
                    key={`${selectedSong.id}-${difficulty.slot}-${difficulty.level}-${index}`}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    type="button"
                  >
                    {difficulty.slot} {difficulty.level}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="primaryButton addButton"
              disabled={justAdded === selectedSong.id || !selectedDifficulty}
              onClick={addSelectedSong}
              type="button"
            >
              {justAdded === selectedSong.id ? (
                <>
                  <CheckIcon className="tinyIcon" />
                  <span>Added to Queue</span>
                </>
              ) : (
                <>
                  <PlusIcon className="tinyIcon" />
                  <span>Add to Queue</span>
                </>
              )}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
