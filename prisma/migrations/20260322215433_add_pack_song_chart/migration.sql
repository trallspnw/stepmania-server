-- CreateTable
CREATE TABLE "packs" (
    "id" SERIAL NOT NULL,
    "folder_name" TEXT NOT NULL,
    "sort_index" TEXT,
    "titles" TEXT NOT NULL,
    "platforms" TEXT,
    "regions" TEXT,
    "earliest_release" TEXT,
    "source" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_community" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" SERIAL NOT NULL,
    "pack_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "title_translit" TEXT,
    "artist" TEXT,
    "artist_translit" TEXT,
    "genre" TEXT,
    "credit" TEXT,
    "display_bpm" TEXT,
    "bpm_min" DOUBLE PRECISION,
    "bpm_max" DOUBLE PRECISION,
    "offset" DOUBLE PRECISION,
    "sample_start" DOUBLE PRECISION,
    "sample_length" DOUBLE PRECISION,
    "file_path" TEXT NOT NULL,
    "simfile_type" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "ingest_flags" TEXT,
    "last_scanned" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charts" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "game_mode" TEXT NOT NULL,
    "difficulty_slot" TEXT NOT NULL,
    "meter" INTEGER NOT NULL,
    "author" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_history" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score" DECIMAL(5,2),
    "grade" TEXT,
    "played_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packs_folder_name_key" ON "packs"("folder_name");

-- CreateIndex
CREATE UNIQUE INDEX "songs_file_path_key" ON "songs"("file_path");

-- CreateIndex
CREATE UNIQUE INDEX "charts_song_id_game_mode_difficulty_slot_key" ON "charts"("song_id", "game_mode", "difficulty_slot");

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charts" ADD CONSTRAINT "charts_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
