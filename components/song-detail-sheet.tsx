"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, PlayIcon, PlusIcon, StopIcon } from "@/components/icons";
import { useApp } from "@/lib/app-context";
import { BrowseDifficulty, BrowseSongRecord, getDifficultyTone } from "@/lib/library-browser";

interface SongDetailSheetProps {
  song: BrowseSongRecord | null;
  onClose: () => void;
}

export function SongDetailSheet({ song, onClose }: SongDetailSheetProps) {
  const { addToQueue } = useApp();
  const [selectedDifficulty, setSelectedDifficulty] = useState<BrowseDifficulty | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [bannerSrc, setBannerSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewStopTimeoutRef = useRef<number | null>(null);
  const previewSongIdRef = useRef<string | null>(null);

  function stopPreview() {
    if (previewStopTimeoutRef.current != null) {
      window.clearTimeout(previewStopTimeoutRef.current);
      previewStopTimeoutRef.current = null;
    }

    const audio = previewAudioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setPreviewPlaying(false);
    setPreviewLoading(false);
  }

  useEffect(() => {
    setSelectedDifficulty(song?.difficulties[0] ?? null);
  }, [song?.id]);

  useEffect(() => {
    return () => {
      stopPreview();
      previewAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    stopPreview();
    setPreviewError(null);
  }, [song?.id]);

  useEffect(() => {
    if (!song) {
      setBannerSrc((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    const songId = song.id;

    async function loadBanner() {
      try {
        const response = await fetch(`/api/library/browse/songs/${songId}/banner`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled) {
            setBannerSrc((current) => {
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
          setBannerSrc((current) => {
            if (current) {
              URL.revokeObjectURL(current);
            }
            return objectUrl;
          });
        }
      } catch {
        if (!cancelled) {
          setBannerSrc((current) => {
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
  }, [song]);

  useEffect(() => {
    if (!justAdded) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setJustAdded(null);
      onClose();
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [justAdded, onClose]);

  async function addSelectedSong() {
    if (!song || !selectedDifficulty) return;

    const didAdd = await addToQueue(Number(song.id), selectedDifficulty.chartId);

    if (didAdd) {
      setJustAdded(song.id);
    }
  }

  async function togglePreview() {
    if (!song) {
      return;
    }

    if (previewPlaying) {
      stopPreview();
      return;
    }

    setPreviewError(null);
    setPreviewLoading(true);

    let audio = previewAudioRef.current;
    const previewUrl = `/api/library/browse/songs/${song.id}/preview`;
    const isNewSong = previewSongIdRef.current !== song.id;

    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audio.loop = false;
      audio.addEventListener("ended", () => {
        setPreviewPlaying(false);
        setPreviewLoading(false);
      });
      audio.addEventListener("error", () => {
        setPreviewPlaying(false);
        setPreviewLoading(false);
        setPreviewError("Preview unavailable");
      });
      previewAudioRef.current = audio;
    }

    if (isNewSong || !audio.src.endsWith(previewUrl)) {
      audio.pause();
      audio.src = previewUrl;
      audio.load();
      previewSongIdRef.current = song.id;
    }

    const previewStart = song.sampleStart ?? 0;
    const previewLength = song.sampleLength ?? 15;

    try {
      if (audio.readyState < 1) {
        await new Promise<void>((resolve, reject) => {
          const handleLoadedMetadata = () => {
            audio?.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio?.removeEventListener("error", handleError);
            resolve();
          };
          const handleError = () => {
            audio?.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio?.removeEventListener("error", handleError);
            reject(new Error("Preview unavailable"));
          };

          audio?.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
          audio?.addEventListener("error", handleError, { once: true });
        });
      }

      const targetTime = Math.max(0, previewStart);

      if (Math.abs(audio.currentTime - targetTime) > 0.05) {
        await new Promise<void>((resolve, reject) => {
          const handleSeeked = () => {
            audio?.removeEventListener("seeked", handleSeeked);
            audio?.removeEventListener("error", handleError);
            resolve();
          };
          const handleError = () => {
            audio?.removeEventListener("seeked", handleSeeked);
            audio?.removeEventListener("error", handleError);
            reject(new Error("Preview unavailable"));
          };

          audio?.addEventListener("seeked", handleSeeked, { once: true });
          audio?.addEventListener("error", handleError, { once: true });
          audio.currentTime = targetTime;
        });
      }

      await audio.play();
      setPreviewPlaying(true);
      setPreviewLoading(false);

      if (previewStopTimeoutRef.current != null) {
        window.clearTimeout(previewStopTimeoutRef.current);
      }

      previewStopTimeoutRef.current = window.setTimeout(() => {
        stopPreview();
      }, Math.max(1, previewLength) * 1000);
    } catch {
      setPreviewPlaying(false);
      setPreviewLoading(false);
      setPreviewError("Preview unavailable");
    }
  }

  if (!song) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Close song details"
        className="sheetBackdrop"
        onClick={onClose}
        type="button"
      />
      <section className="sheet">
        <div className="sheetHandle" />
        {bannerSrc ? (
          <div className="sheetBannerFrame">
            <img alt={`${song.title} banner`} className="sheetBannerImage" src={bannerSrc} />
          </div>
        ) : null}
        <header className="sheetHeader">
          <div className="sheetHeaderCopy">
            <h2>{song.title}</h2>
            <p>{song.artist}</p>
          </div>
          <button
            className={`sheetPreviewButton${previewPlaying ? " isPlaying" : ""}`}
            disabled={previewLoading}
            onClick={() => void togglePreview()}
            aria-label={previewLoading ? "Loading preview" : previewPlaying ? "Stop preview" : "Play preview"}
            title={previewLoading ? "Loading preview" : previewPlaying ? "Stop preview" : "Play preview"}
            type="button"
          >
            {previewPlaying || previewLoading ? (
              <StopIcon className="sheetPreviewIcon" />
            ) : (
              <PlayIcon className="sheetPreviewIcon" />
            )}
          </button>
        </header>

        <div className="sheetMetaGrid">
          <div>
            <span className="inputLabel">Pack</span>
            <strong>{song.pack}</strong>
          </div>
          <div>
            <span className="inputLabel">BPM</span>
            <strong>{song.bpmLabel || "-"}</strong>
          </div>
        </div>

        <div className="stack tight">
          <span className="inputLabel">Select Difficulty</span>
          <div className="difficultyGrid">
            {song.difficulties.map((difficulty, index) => (
              <button
                className={`pill difficultyButton ${getDifficultyTone(difficulty.slot)}${
                  selectedDifficulty?.chartId === difficulty.chartId ? " isSelected" : ""
                }`}
                key={`${song.id}-${difficulty.chartId}-${index}`}
                onClick={() => setSelectedDifficulty(difficulty)}
                type="button"
              >
                {difficulty.slot} {difficulty.level}
              </button>
            ))}
          </div>
        </div>

        {previewError ? <p className="muted">{previewError}</p> : null}

        <button
          className="primaryButton addButton"
          disabled={justAdded === song.id || !selectedDifficulty}
          onClick={addSelectedSong}
          type="button"
        >
          {justAdded === song.id ? (
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
  );
}
