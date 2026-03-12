export const SETTING_KEYS = {
  CURRENT_SONG_PATH: "current_song_path",
  CURRENT_SONG_DIFFICULTY: "current_song_difficulty",
  CURRENT_PLAYER_ID: "current_player_id",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
