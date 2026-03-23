export const DEFAULT_LIBRARY_GAME_MODE = "dance-single";

export const LIBRARY_GAME_MODE_OPTIONS = [
  { value: "dance-single", label: "Single" },
  { value: "dance-double", label: "Double" },
  { value: "dance-solo", label: "Solo" },
  { value: "pump-single", label: "Pump Single" },
  { value: "pump-double", label: "Pump Double" },
] as const;

const VALID_LIBRARY_GAME_MODES = new Set<string>(
  LIBRARY_GAME_MODE_OPTIONS.map((option) => option.value),
);

export function isValidLibraryGameMode(value: string) {
  return VALID_LIBRARY_GAME_MODES.has(value);
}

export function normalizeLibraryGameMode(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_LIBRARY_GAME_MODE;
  }

  return isValidLibraryGameMode(value) ? value : DEFAULT_LIBRARY_GAME_MODE;
}

export function getLibraryGameModeLabel(value: string) {
  return (
    LIBRARY_GAME_MODE_OPTIONS.find((option) => option.value === value)?.label ??
    DEFAULT_LIBRARY_GAME_MODE
  );
}
