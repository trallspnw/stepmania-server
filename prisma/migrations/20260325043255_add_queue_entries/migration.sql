-- CreateTable
CREATE TABLE "queue_entries" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "song_id" INTEGER NOT NULL,
    "chart_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "play_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queue_entries_status_play_order_idx" ON "queue_entries"("status", "play_order");

-- CreateIndex
CREATE INDEX "queue_entries_user_id_status_created_at_idx" ON "queue_entries"("user_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "charts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
