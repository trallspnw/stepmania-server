export const SETTING_KEYS = {
  LIBRARY_GAME_MODE: "library_game_mode",
  OPEN_SIGN_UP: "open_sign_up",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
