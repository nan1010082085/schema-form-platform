/*
  Warnings:

  - A unique constraint covering the columns `[publishId]` on the table `form_schemas` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "schema_type" AS ENUM ('form', 'search_list');

-- CreateEnum
CREATE TYPE "schema_status" AS ENUM ('draft', 'published');

-- AlterTable
ALTER TABLE "form_schemas" ADD COLUMN     "publishId" UUID,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "status" "schema_status" NOT NULL DEFAULT 'draft',
ADD COLUMN     "type" "schema_type" NOT NULL DEFAULT 'form';

-- CreateIndex
CREATE UNIQUE INDEX "form_schemas_publishId_key" ON "form_schemas"("publishId");
