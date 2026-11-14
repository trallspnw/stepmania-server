-- AlterTable
ALTER TABLE "queue_entries" ADD COLUMN     "joined_at" TIMESTAMPTZ(6),
ADD COLUMN     "joined_chart_id" INTEGER,
ADD COLUMN     "joined_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_joined_user_id_fkey" FOREIGN KEY ("joined_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_joined_chart_id_fkey" FOREIGN KEY ("joined_chart_id") REFERENCES "charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
