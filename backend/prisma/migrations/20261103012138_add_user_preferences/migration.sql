-- CreateEnum
CREATE TYPE "ThemeColor" AS ENUM ('BLUE', 'AMBER', 'EMERALD');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "themeColor" "ThemeColor" NOT NULL DEFAULT 'BLUE',
ADD COLUMN     "themeMode" "ThemeMode" NOT NULL DEFAULT 'LIGHT';
