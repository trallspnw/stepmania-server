DELETE FROM "settings"
WHERE "key" IN (
  'current_song_path',
  'current_song_difficulty',
  'current_player_id'
);
