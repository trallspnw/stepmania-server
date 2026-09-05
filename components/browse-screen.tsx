"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  ChevronRightIcon,
  FilterIcon,
  FolderIcon,
  SearchIcon,
  TrophyIcon,
} from "@/components/icons";
import { SongDetailSheet } from "@/components/song-detail-sheet";
import {
  BrowsePackRecord,
  BrowsePacksResponse,
  BrowseSongRecord,
  BrowseSongsResponse,
  getDifficultyGradient,
  getDifficultyRange,
  getPackRegionEmojis,
  getPreferredPlatform,
  getReleaseYear,
  hasCustomDifficulty,
} from "@/lib/library-browser";
import { getLibraryGameModeLabel } from "@/lib/library-mode";

type BrowseMode = "search" | "packs" | "popular";
type FolderView = { packId: number; value: string } | null;

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode");
  const browseMode: BrowseMode =
    modeParam === "packs" || modeParam === "popular" ? modeParam : "search";

  const packIdParam = searchParams.get("packId");
  const packLabelParam = searchParams.get("packLabel");
  const folderView: FolderView = useMemo(() => {
    if (packIdParam) {
      return { packId: Number(packIdParam), value: packLabelParam ?? "" };
    }

    return null;
  }, [packIdParam, packLabelParam]);

  const songParam = searchParams.get("song");

  function updateBrowseParams(
    mutate: (params: URLSearchParams) => void,
    options?: { replace?: boolean; scroll?: boolean },
  ) {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    const navigateOptions = { scroll: options?.scroll ?? true };

    if (options?.replace) {
      router.replace(url, navigateOptions);
    } else {
      router.push(url, navigateOptions);
    }
  }

  function setBrowseMode(mode: BrowseMode) {
    updateBrowseParams((params) => {
      if (mode === "search") {
        params.delete("mode");
      } else {
        params.set("mode", mode);
      }
      params.delete("packId");
      params.delete("packLabel");
    });
  }

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedSong, setSelectedSong] = useState<BrowseSongRecord | null>(null);
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

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLElement | null>(null);
  const backgroundScrollYRef = useRef(0);

  useEffect(() => {
    if (!songParam) {
      setSelectedSong(null);
      const targetScrollY = backgroundScrollYRef.current;
      requestAnimationFrame(() => {
        window.scrollTo(0, targetScrollY);
      });
    }
  }, [songParam]);

  useEffect(() => {
    if (!selectedSong) {
      return;
    }

    function handleScroll() {
      backgroundScrollYRef.current = window.scrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  const songsModeActive = browseMode === "search" || browseMode === "popular" || folderView !== null;
  const isSearchEmpty = browseMode === "search" && !folderView && !deferredSearch.trim();
  const shouldFetchSongs = songsModeActive && !isSearchEmpty;

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
    if (!shouldFetchSongs) {
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

    if (browseMode === "popular") {
      searchParams.set("sort", "popular");
    }

    if (folderView) {
      searchParams.set("packId", String(folderView.packId));
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
    shouldFetchSongs,
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

        if (browseMode === "packs" && !packsLoading && packsPage < packsTotalPages) {
          setPacksPage((current) => current + 1);
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
    backgroundScrollYRef.current = window.scrollY;
    setSelectedSong(song);
    updateBrowseParams(
      (params) => {
        params.set("song", song.id);
      },
      { scroll: false },
    );
  }

  function closeSong() {
    router.back();
  }

  function openFolder(nextFolderView: Exclude<FolderView, null>) {
    updateBrowseParams((params) => {
      params.set("packId", String(nextFolderView.packId));
      params.set("packLabel", nextFolderView.value);
    });
  }

  function closeFolder() {
    router.back();
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

  const currentListTotal = songsModeActive ? songsTotal : packsTotal;
  const currentHasMore = songsModeActive ? songsPage < songsTotalPages : packsPage < packsTotalPages;
  const currentLoading = songsModeActive ? songsLoading : packsLoading;
  const currentError = songsModeActive ? songsError : packsError;

  return (
    <div className="stack browseStack">
      {folderView ? (
        <div className="toolbar">
          <button
            className="iconButton"
            onClick={closeFolder}
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
                className={`segmentButton${browseMode === "popular" ? " isSelected" : ""}`}
                onClick={() => setBrowseMode("popular")}
                type="button"
              >
                <TrophyIcon className="tinyIcon" />
                <span>Popular</span>
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
          {isSearchEmpty ? (
            <div className="card emptyInline">Type to search songs, artists, or packs</div>
          ) : (
            <>
              {songsError ? <div className="card emptyInline">{songsError}</div> : null}
              {!songsError && songs.length === 0 && !songsLoading ? (
                <div className="card emptyInline">
                  {browseMode === "popular" ? "No plays yet" : "No songs found"}
                </div>
              ) : null}
            </>
          )}
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
          {!currentError && packs.length === 0 && !packsLoading ? (
            <div className="card emptyInline">No packs found</div>
          ) : null}
          {packs.map((pack) => (
            <button
              className="folderRow"
              key={pack.id}
              onClick={() =>
                openFolder({
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

      <SongDetailSheet onClose={closeSong} song={selectedSong} />
    </div>
  );
}
