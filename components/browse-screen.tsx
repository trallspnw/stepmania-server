"use client";

import {
  CSSProperties,
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
  minDifficulty: number;
  maxDifficulty: number;
  minBpm: number;
  maxBpm: number;
}

const defaultFilters: Filters = {
  minDifficulty: 1,
  maxDifficulty: 25,
  minBpm: 100,
  maxBpm: 450,
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

  const hasActiveFilters =
    filters.minDifficulty !== defaultFilters.minDifficulty ||
    filters.maxDifficulty !== defaultFilters.maxDifficulty ||
    filters.minBpm !== defaultFilters.minBpm ||
    filters.maxBpm !== defaultFilters.maxBpm;

  const songsModeActive = browseMode === "search" || folderView !== null;

  const songQueryKey = useMemo(
    () =>
      JSON.stringify({
        query: browseMode === "search" ? deferredSearch.trim() : "",
        folderView,
        filters,
      }),
    [browseMode, deferredSearch, filters, folderView],
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

    const searchParams = new URLSearchParams({
      page: String(songsPage),
      minDifficulty: String(filters.minDifficulty),
      maxDifficulty: String(filters.maxDifficulty),
      minBpm: String(filters.minBpm),
      maxBpm: String(filters.maxBpm),
    });

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
  }, [browseMode, deferredSearch, filters, folderView, songQueryKey, songsModeActive, songsPage]);

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
              {songsTotal} songs · {getLibraryGameModeLabel(activeGameMode)}
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

          <div className="browseModeMeta muted">{getLibraryGameModeLabel(activeGameMode)}</div>
        </>
      )}

      {filtersOpen ? (
        <section className="card filterCard">
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
                {filters.minDifficulty} - {filters.maxDifficulty}
              </span>
            </div>
            <div className="rangeGrid">
              <label>
                <span className="inputLabel">Min</span>
                <input
                  max={filters.maxDifficulty}
                  min={1}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      minDifficulty: Number(event.target.value),
                    }))
                  }
                  type="range"
                  value={filters.minDifficulty}
                />
              </label>
              <label>
                <span className="inputLabel">Max</span>
                <input
                  max={25}
                  min={filters.minDifficulty}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      maxDifficulty: Number(event.target.value),
                    }))
                  }
                  type="range"
                  value={filters.maxDifficulty}
                />
              </label>
            </div>
          </div>

          <div className="filterGroup">
            <div className="splitRow">
              <span>BPM Range</span>
              <span className="muted">
                {filters.minBpm} - {filters.maxBpm}
              </span>
            </div>
            <div className="rangeGrid">
              <label>
                <span className="inputLabel">Min</span>
                <input
                  max={filters.maxBpm}
                  min={100}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      minBpm: Number(event.target.value),
                    }))
                  }
                  step={5}
                  type="range"
                  value={filters.minBpm}
                />
              </label>
              <label>
                <span className="inputLabel">Max</span>
                <input
                  max={450}
                  min={filters.minBpm}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      maxBpm: Number(event.target.value),
                    }))
                  }
                  step={5}
                  type="range"
                  value={filters.maxBpm}
                />
              </label>
            </div>
          </div>
        </section>
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
