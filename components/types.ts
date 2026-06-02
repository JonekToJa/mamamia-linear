import type {
  Board,
  Card,
  CardOwner,
  CardTag,
  Column,
  Tag,
  User,
} from "@prisma/client";

export type CardWithRels = Card & {
  owners: (CardOwner & { user: User })[];
  tags: (CardTag & { tag: Tag })[];
};

export type ColumnWithCards = Column & { cards: CardWithRels[] };

export type BoardWithEverything = Board & {
  tags: Tag[];
  columns: ColumnWithCards[];
};

export type BoardSummary = { id: string; name: string };
