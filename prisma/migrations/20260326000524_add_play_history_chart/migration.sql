/*
  Warnings:

  - Added the required column `chart_id` to the `play_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "play_history" ADD COLUMN     "chart_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "charts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
