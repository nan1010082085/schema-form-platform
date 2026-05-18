-- CreateTable
CREATE TABLE "form_schemas" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_schemas_pkey" PRIMARY KEY ("id")
);
