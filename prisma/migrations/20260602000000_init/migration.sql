-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CARD_MOVED', 'CARD_MOVED_BOARD', 'OWNER_ADDED', 'OWNER_REMOVED', 'DATE_SET', 'DATE_CLEARED', 'TAG_ADDED', 'TAG_REMOVED', 'CHECKLIST_CREATED', 'CHECKLIST_DELETED', 'CHECKLIST_ITEM_ADDED', 'CHECKLIST_ITEM_REMOVED', 'CHECKLIST_ITEM_TOGGLED', 'CHECKLIST_ITEM_OWNER_ADDED', 'CHECKLIST_ITEM_OWNER_REMOVED', 'CHECKLIST_ITEM_DATE_SET', 'CHECKLIST_ITEM_DATE_CLEARED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_members" (
    "board_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("board_id","user_id")
);

-- CreateTable
CREATE TABLE "columns" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "column_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description_html" TEXT,
    "due_date" TIMESTAMP(3),
    "position" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_owners" (
    "card_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "card_owners_pkey" PRIMARY KEY ("card_id","user_id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_tags" (
    "card_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "card_tags_pkey" PRIMARY KEY ("card_id","tag_id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL,
    "checklist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "position" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_item_owners" (
    "checklist_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "checklist_item_owners_pkey" PRIMARY KEY ("checklist_item_id","user_id")
);

-- CreateTable
CREATE TABLE "checklist_item_tags" (
    "checklist_item_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "checklist_item_tags_pkey" PRIMARY KEY ("checklist_item_id","tag_id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "board_members_user_id_idx" ON "board_members"("user_id");

-- CreateIndex
CREATE INDEX "columns_board_id_position_idx" ON "columns"("board_id", "position");

-- CreateIndex
CREATE INDEX "cards_column_id_position_idx" ON "cards"("column_id", "position");

-- CreateIndex
CREATE INDEX "card_owners_user_id_idx" ON "card_owners"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_board_id_name_key" ON "tags"("board_id", "name");

-- CreateIndex
CREATE INDEX "card_tags_tag_id_idx" ON "card_tags"("tag_id");

-- CreateIndex
CREATE INDEX "checklists_card_id_position_idx" ON "checklists"("card_id", "position");

-- CreateIndex
CREATE INDEX "checklist_items_checklist_id_position_idx" ON "checklist_items"("checklist_id", "position");

-- CreateIndex
CREATE INDEX "checklist_item_owners_user_id_idx" ON "checklist_item_owners"("user_id");

-- CreateIndex
CREATE INDEX "checklist_item_tags_tag_id_idx" ON "checklist_item_tags"("tag_id");

-- CreateIndex
CREATE INDEX "comments_card_id_created_at_idx" ON "comments"("card_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_card_id_created_at_idx" ON "activities"("card_id", "created_at");

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "columns" ADD CONSTRAINT "columns_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_column_id_fkey" FOREIGN KEY ("column_id") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_owners" ADD CONSTRAINT "card_owners_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_owners" ADD CONSTRAINT "card_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_owners" ADD CONSTRAINT "checklist_item_owners_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_owners" ADD CONSTRAINT "checklist_item_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_tags" ADD CONSTRAINT "checklist_item_tags_checklist_item_id_fkey" FOREIGN KEY ("checklist_item_id") REFERENCES "checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_item_tags" ADD CONSTRAINT "checklist_item_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

