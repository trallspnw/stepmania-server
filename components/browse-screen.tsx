"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  Difficulty,
  getDifficultyRange,
  getDifficultyTone,
  getUniqueArtists,
  getUniquePacks,
  songs,
  Song,
} from "@/lib/mock-data";

type BrowseMode = "search" | "packs" | "artists";
type FolderView = { type: "pack" | "artist"; value: string } | null;

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

export function BrowseScreen() {
  const { addToQueue } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [browseMode, setBrowseMode] = useState<BrowseMode>("search");
  const [folderView, setFolderView] = useState<FolderView>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = window.setTimeout(() => {
      setJustAdded(null);
      setSelectedSong(null);
      setSelectedDifficulty(null);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [justAdded]);

  const packs = useMemo(() => getUniquePacks(), []);
  const artists = useMemo(() => getUniqueArtists(), []);

  const hasActiveFilters =
    filters.minDifficulty !== defaultFilters.minDifficulty ||
    filters.maxDifficulty !== defaultFilters.maxDifficulty ||
    filters.minBpm !== defaultFilters.minBpm ||
    filters.maxBpm !== defaultFilters.maxBpm;

  const filteredSongs = useMemo(() => {
    let result = songs;

    if (folderView) {
      result = songs.filter((song) =>
        folderView.type === "pack"
          ? song.pack === folderView.value
          : song.artist === folderView.value,
      );
    } else if (browseMode === "search" && deferredSearch) {
      const term = deferredSearch.toLowerCase();
      result = songs.filter(
        (song) =>
          song.title.toLowerCase().includes(term) ||
          song.artist.toLowerCase().includes(term) ||
          song.pack.toLowerCase().includes(term),
      );
    }

    return result.filter((song) => {
      const { min, max } = getDifficultyRange(song);
      const hasDifficultyInRange =
        min <= filters.maxDifficulty && max >= filters.minDifficulty;
      const bpmInRange = song.bpm >= filters.minBpm && song.bpm <= filters.maxBpm;
      return hasDifficultyInRange && bpmInRange;
    });
  }, [browseMode, deferredSearch, filters, folderView]);

  const selectedList = browseMode === "packs" ? packs : artists;

  function openSong(song: Song) {
    setSelectedSong(song);
    setSelectedDifficulty(song.difficulties[0] ?? null);
  }

  function addSelectedSong() {
    if (!selectedSong || !selectedDifficulty) return;
    addToQueue(selectedSong.id, selectedDifficulty);
    setJustAdded(selectedSong.id);
  }

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
            <p>{filteredSongs.length} songs</p>
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

      {browseMode === "search" || folderView ? (
        <div className="stack tight">
          {filteredSongs.length === 0 ? (
            <div className="card emptyInline">No songs found</div>
          ) : (
            filteredSongs.map((song) => {
              const { min, max } = getDifficultyRange(song);
              return (
                <button
                  className="card songCard"
                  key={song.id}
                  onClick={() => openSong(song)}
                  type="button"
                >
                  <div className="songCardCopy">
                    <h3>{song.title}</h3>
                    <p>{song.artist}</p>
                    <div className="metaRow wrap muted">
                      <span>{song.pack}</span>
                      <span>{song.bpm} BPM</span>
                    </div>
                  </div>
                  <span className="softPill">{min === max ? min : `${min}-${max}`}</span>
                </button>
              );
            })
          )}
        </div>
      ) : (
        <div className="stack tight">
          {selectedList.map((item) => {
            const count = songs.filter((song) =>
              browseMode === "packs" ? song.pack === item : song.artist === item,
            ).length;
            const Icon = browseMode === "packs" ? FolderIcon : UserIcon;

            return (
              <button
                className="folderRow"
                key={item}
                onClick={() =>
                  setFolderView({
                    type: browseMode === "packs" ? "pack" : "artist",
                    value: item,
                  })
                }
                type="button"
              >
                <div className="folderIconWrap">
                  <Icon className="tinyIcon" />
                </div>
                <div className="folderCopy">
                  <h3>{item}</h3>
                  <p>{count} songs</p>
                </div>
                <ChevronRightIcon className="tinyIcon mutedIcon" />
              </button>
            );
          })}
        </div>
      )}

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
                <strong>{selectedSong.bpm}</strong>
              </div>
            </div>

            <div className="stack tight">
              <span className="inputLabel">Select Difficulty</span>
              <div className="difficultyGrid">
                {selectedSong.difficulties.map((difficulty) => (
                  <button
                    className={`pill difficultyButton ${getDifficultyTone(difficulty.slot)}${
                      selectedDifficulty?.slot === difficulty.slot ? " isSelected" : ""
                    }`}
                    key={difficulty.slot}
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
