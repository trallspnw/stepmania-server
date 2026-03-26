export const SETTING_KEYS = {
  LIBRARY_GAME_MODE: "library_game_mode",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
