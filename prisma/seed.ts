import { PrismaClient, Prisma, ActivityType } from "@prisma/client";
import { sanitizeRichText } from "../lib/sanitize";

const prisma = new PrismaClient();

const MOCK_USER = {
  name: "Jonasz Kopecki",
  email: "jonaszkopecki@gmail.com",
};

const DEMO_USERS = [
  { name: "Alice Nowak", email: "alice@example.com" },
  { name: "Bartek Lis", email: "bartek@example.com" },
  { name: "Celina Wrona", email: "celina@example.com" },
  { name: "Damian Krol", email: "damian@example.com" },
  { name: "Ewa Sobczak", email: "ewa@example.com" },
  { name: "Filip Marek", email: "filip@example.com" },
  { name: "Gosia Dab", email: "gosia@example.com" },
  { name: "Hubert Zych", email: "hubert@example.com" },
];

// Tag spec is shared across all boards (tags are board-scoped per CLAUDE.md,
// so we materialize the same set inside each board).
const TAG_SPEC: { name: string; color: string }[] = [
  { name: "Frontend", color: "#3b82f6" },
  { name: "Backend", color: "#10b981" },
  { name: "KR", color: "#a855f7" },
  { name: "OKR", color: "#8b5cf6" },
  { name: "Priority: Low", color: "#9ca3af" },
  { name: "Priority: Medium", color: "#facc15" },
  { name: "Priority: High", color: "#f97316" },
  { name: "Priority: Critical", color: "#ef4444" },
  { name: "Blocked", color: "#dc2626" },
  { name: "System App", color: "#0ea5e9" },
  { name: "Platform", color: "#14b8a6" },
];

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

type UserMap = Record<string, string>; // email -> id
type TagMap = Record<string, string>; // tag name -> id (within one board)
type ColumnMap = Record<string, { id: string; position: number }>;

async function wipeBoards() {
  // Cascades take care of columns/cards/checklists/items/tags/m2m/comments/activities.
  await prisma.board.deleteMany({});
}

async function upsertUsers(): Promise<{ mockUserId: string; users: UserMap }> {
  const mock = await prisma.user.upsert({
    where: { email: MOCK_USER.email },
    update: { name: MOCK_USER.name },
    create: MOCK_USER,
  });

  const users: UserMap = { [MOCK_USER.email]: mock.id };
  for (const u of DEMO_USERS) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: u,
    });
    users[u.email] = row.id;
  }
  return { mockUserId: mock.id, users };
}

async function createBoard(args: {
  name: string;
  memberEmails: string[];
  columnNames: string[];
  users: UserMap;
}): Promise<{ boardId: string; columns: ColumnMap; tags: TagMap }> {
  const board = await prisma.board.create({
    data: {
      name: args.name,
      members: {
        create: args.memberEmails.map((email) => ({
          userId: args.users[email],
        })),
      },
      columns: {
        create: args.columnNames.map((name, i) => ({
          name,
          position: (i + 1) * 1.0,
        })),
      },
      tags: {
        create: TAG_SPEC.map((t) => ({ name: t.name, color: t.color })),
      },
    },
    include: { columns: true, tags: true },
  });

  const columns: ColumnMap = {};
  for (const c of board.columns) {
    columns[c.name] = { id: c.id, position: c.position };
  }
  const tags: TagMap = {};
  for (const t of board.tags) tags[t.name] = t.id;

  return { boardId: board.id, columns, tags };
}

type CardSpec = {
  title: string;
  descriptionHtml?: string;
  column: string;
  position: number;
  dueDate?: Date;
  ownerEmails?: string[];
  tagNames?: string[];
  checklists?: { title: string; items: { title: string; completed?: boolean }[] }[];
  comments?: { authorEmail: string; body: string; daysAgo?: number }[];
  activities?: { actorEmail: string; type: ActivityType; payload?: Prisma.InputJsonValue; daysAgo?: number }[];
};

async function createCards(args: {
  cards: CardSpec[];
  columns: ColumnMap;
  tags: TagMap;
  users: UserMap;
}) {
  for (const c of args.cards) {
    const col = args.columns[c.column];
    if (!col) throw new Error(`Unknown column: ${c.column}`);

    const card = await prisma.card.create({
      data: {
        columnId: col.id,
        title: c.title,
        descriptionHtml: c.descriptionHtml
          ? sanitizeRichText(c.descriptionHtml)
          : null,
        dueDate: c.dueDate ?? null,
        position: c.position,
        owners: c.ownerEmails
          ? {
              create: c.ownerEmails.map((email) => ({
                userId: args.users[email],
              })),
            }
          : undefined,
        tags: c.tagNames
          ? {
              create: c.tagNames.map((name) => {
                const tagId = args.tags[name];
                if (!tagId) throw new Error(`Unknown tag: ${name}`);
                return { tagId };
              }),
            }
          : undefined,
        checklists: c.checklists
          ? {
              create: c.checklists.map((cl, ci) => ({
                title: cl.title,
                position: (ci + 1) * 1.0,
                items: {
                  create: cl.items.map((it, ii) => ({
                    title: it.title,
                    completed: it.completed ?? false,
                    position: (ii + 1) * 1.0,
                  })),
                },
              })),
            }
          : undefined,
        comments: c.comments
          ? {
              create: c.comments.map((cm) => ({
                authorUserId: args.users[cm.authorEmail],
                body: cm.body,
                createdAt: daysFromNow(-(cm.daysAgo ?? 0)),
              })),
            }
          : undefined,
      },
    });

    if (c.activities && c.activities.length > 0) {
      for (const a of c.activities) {
        await prisma.activity.create({
          data: {
            cardId: card.id,
            actorUserId: args.users[a.actorEmail],
            type: a.type,
            payload: (a.payload ?? {}) as Prisma.InputJsonValue,
            createdAt: daysFromNow(-(a.daysAgo ?? 0)),
          },
        });
      }
    }
  }
}

async function seedSprintBoard(users: UserMap) {
  const { columns, tags } = await createBoard({
    name: "Sprint",
    memberEmails: [
      MOCK_USER.email,
      "alice@example.com",
      "bartek@example.com",
      "celina@example.com",
      "damian@example.com",
      "ewa@example.com",
      "filip@example.com",
    ],
    columnNames: ["Backlog", "TODO", "In Progress", "Verify", "Done"],
    users,
  });

  const cards: CardSpec[] = [
    // ---------------- Backlog ----------------
    {
      title: "Epic: Customer Portal Redesign",
      column: "Backlog",
      position: 1,
      tagNames: ["Frontend", "Platform", "Priority: Medium"],
      descriptionHtml: `<p>Modernize the customer portal — new IA, refreshed visual language, and a faster page transition story.</p><p>Spanning roughly two sprints. Coordination with Design on tokens and with Backend on the new <strong>/v2/me</strong> contract.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "All portal routes migrated to the new shell layout" },
            { title: "Lighthouse perf score >= 85 on the dashboard route" },
            { title: "Design tokens consumed via @mm/tokens, no hardcoded hex" },
            { title: "Old portal routes 301 redirect to new ones" },
          ],
        },
      ],
    },
    {
      title: "Epic: Multi-region failover for Platform API",
      column: "Backlog",
      position: 2,
      tagNames: ["Backend", "Platform", "Priority: High"],
      descriptionHtml: `<p>Stand up a warm standby in <em>eu-west</em> and prove a 5 minute RTO under a simulated primary outage.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Standby region provisioned via Terraform module" },
            { title: "Postgres streaming replication lag < 10s in steady state" },
            { title: "Runbook for failover documented and reviewed" },
            { title: "Game day exercise completed with on-call team" },
          ],
        },
      ],
    },
    {
      title: "User Story: Export board to CSV",
      column: "Backlog",
      position: 3,
      tagNames: ["Frontend", "Priority: Low"],
      descriptionHtml: `<p>As a project manager I want to export the current board view to CSV so I can share status outside the tool.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Export button visible in board header overflow menu" },
            { title: "CSV includes: card title, column, owners, tags, due date" },
            { title: "File name format: {board}-{yyyy-mm-dd}.csv" },
          ],
        },
      ],
    },
    {
      title: "User Story: Keyboard shortcut to create a card",
      column: "Backlog",
      position: 4,
      tagNames: ["Frontend", "Priority: Low"],
      descriptionHtml: `<p>Power users want to add cards without reaching for the mouse.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Pressing 'c' on the board opens the new-card input" },
            { title: "Shortcut is disabled while focus is in an input/textarea" },
            { title: "Shortcut documented in the help menu" },
          ],
        },
      ],
    },

    // ---------------- TODO ----------------
    {
      title: "User Story: Drag to reorder cards within a column",
      column: "TODO",
      position: 1,
      tagNames: ["Frontend", "Priority: High"],
      ownerEmails: ["alice@example.com", MOCK_USER.email],
      dueDate: daysFromNow(7),
      descriptionHtml: `<p>As a user I want to drag cards up and down within a column so I can express priority without renaming or tagging.</p><p>Persisted via fractional <strong>position</strong> floats — never renumber siblings on a single move.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Drag handle visible on hover, not when dragging is disabled" },
            { title: "Optimistic update reorders immediately, rolls back on API error" },
            { title: "Server picks fractional position between neighbours" },
            { title: "Activity log records CARD_MOVED with from/to position" },
          ],
        },
      ],
      comments: [
        {
          authorEmail: "alice@example.com",
          body: "Picking this up Monday. I'll spike react-dnd first and fall back to native HTML5 DnD if it feels heavy.",
          daysAgo: 1,
        },
      ],
    },
    {
      title: "User Story: Move card to a different board",
      column: "TODO",
      position: 2,
      tagNames: ["Frontend", "Backend", "Priority: Medium"],
      ownerEmails: ["bartek@example.com"],
      dueDate: daysFromNow(10),
      descriptionHtml: `<p>From the card drawer overflow menu, the user can pick a destination board. The card lands at the top of the leftmost column in the target board.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Destination picker shows only boards the current user is a member of" },
            { title: "Card lands in the column with min position on the target board" },
            { title: "Tags that don't exist on the target board are dropped (with a confirm dialog)" },
            { title: "Activity log records CARD_MOVED_BOARD with from_board_id and to_board_id" },
          ],
        },
      ],
    },
    {
      title: "User Story: Rich text in card descriptions",
      column: "TODO",
      position: 3,
      tagNames: ["Frontend", "Priority: Medium"],
      ownerEmails: ["celina@example.com"],
      dueDate: daysFromNow(5),
      descriptionHtml: `<p>Card descriptions become a Tiptap surface that stores sanitized HTML.</p><p>Supported marks: <strong>bold</strong>, <em>italic</em>, <u>underline</u>. Lists and links autolink on paste.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Tiptap editor mounts with StarterKit + Underline + Link" },
            { title: "Server-side sanitize-html strips disallowed tags before save" },
            { title: "Links open in a new tab with rel='noopener noreferrer nofollow'" },
            { title: "Pasted bare URLs become anchors automatically" },
          ],
        },
      ],
    },
    {
      title: "Epic: Activity timeline on the card drawer",
      column: "TODO",
      position: 4,
      tagNames: ["Frontend", "Backend", "Priority: Medium"],
      ownerEmails: [MOCK_USER.email, "damian@example.com"],
      dueDate: daysFromNow(14),
      descriptionHtml: `<p>One unified, scrollable feed of comments + structured activity events, newest first.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "GET /api/cards/:id/timeline returns interleaved comments + activities" },
            { title: "Comments render as plain text; activities render as templated lines" },
            { title: "Empty state shown when no comments and no activities exist" },
          ],
        },
        {
          title: "Out of scope",
          items: [
            { title: "Live updates (no websockets in 1.0)", completed: true },
            { title: "Edit/delete of past activity rows", completed: true },
          ],
        },
      ],
    },

    // ---------------- In Progress ----------------
    {
      title: "User Story: Tag picker on cards",
      column: "In Progress",
      position: 1,
      tagNames: ["Frontend", "Priority: High"],
      ownerEmails: ["alice@example.com"],
      dueDate: daysFromNow(2),
      descriptionHtml: `<p>Inline tag picker in the card drawer header. Tags are board-scoped — the picker only offers tags from the card's board.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Popover lists existing tags, filterable by name", completed: true },
            { title: "Create-new-tag inline if user has write access to the board", completed: true },
            { title: "Color swatch picker on tag creation" },
            { title: "Activity log records TAG_ADDED / TAG_REMOVED" },
          ],
        },
      ],
      comments: [
        {
          authorEmail: "alice@example.com",
          body: "First two items are merged on a feature branch — pushing color picker next.",
          daysAgo: 1,
        },
        {
          authorEmail: MOCK_USER.email,
          body: "Nice. Make sure colors are stored as hex strings, not the swatch name.",
          daysAgo: 0,
        },
      ],
      activities: [
        {
          actorEmail: "alice@example.com",
          type: ActivityType.CARD_MOVED,
          payload: { from_column: "TODO", to_column: "In Progress" },
          daysAgo: 3,
        },
        {
          actorEmail: MOCK_USER.email,
          type: ActivityType.OWNER_ADDED,
          payload: { user_email: "alice@example.com" },
          daysAgo: 3,
        },
      ],
    },
    {
      title: "User Story: Checklist sections on cards",
      column: "In Progress",
      position: 2,
      tagNames: ["Frontend", "Backend", "Priority: High"],
      ownerEmails: ["bartek@example.com", "celina@example.com"],
      dueDate: daysFromNow(4),
      descriptionHtml: `<p>Multiple named checklists per card. Each item can carry its own owner, tag and due date.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Create / rename / delete a checklist section", completed: true },
            { title: "Add / remove / toggle items", completed: true },
            { title: "Assign per-item owner from the card's board members" },
            { title: "Per-item due date with calendar popover" },
            { title: "Item tag picker constrained to the parent card's board tags" },
          ],
        },
      ],
      activities: [
        {
          actorEmail: "bartek@example.com",
          type: ActivityType.CHECKLIST_CREATED,
          payload: { title: "Acceptance criteria" },
          daysAgo: 2,
        },
      ],
    },
    {
      title: "User Story: Sidebar board switcher",
      column: "In Progress",
      position: 3,
      tagNames: ["Frontend", "Priority: Medium"],
      ownerEmails: [MOCK_USER.email],
      dueDate: daysFromNow(6),
      descriptionHtml: `<p>Left sidebar lists every board the current user is a member of. Active board highlighted. Collapsible.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Board list fetched once at layout level", completed: true },
            { title: "Active board highlighted from the URL segment" },
            { title: "Collapsed state persisted in localStorage" },
          ],
        },
      ],
    },
    {
      title: "Epic: Mock auth + single-user mode",
      column: "In Progress",
      position: 4,
      tagNames: ["Backend", "System App", "Blocked"],
      ownerEmails: ["damian@example.com"],
      dueDate: daysFromNow(1),
      descriptionHtml: `<p>1.0 ships without real auth. <code>lib/currentUser.ts</code> resolves the acting user from <strong>MOCK_USER_ID</strong>.</p><p><strong>Blocked</strong> until ops confirms the env var is set on the Railway service.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "getCurrentUser() resolves by env var, falls back to first user", completed: true },
            { title: "All write endpoints stamp actor_user_id from the helper" },
            { title: "MOCK_USER_ID present on Railway production service" },
          ],
        },
      ],
      comments: [
        {
          authorEmail: "damian@example.com",
          body: "Blocked on ops — pinged Hubert in #platform to set the env var.",
          daysAgo: 1,
        },
      ],
    },

    // ---------------- Verify ----------------
    {
      title: "User Story: Board header with member avatars",
      column: "Verify",
      position: 1,
      tagNames: ["Frontend", "Priority: Low"],
      ownerEmails: ["ewa@example.com"],
      dueDate: daysFromNow(-1),
      descriptionHtml: `<p>Top of every board: name, member avatar stack, "+N" overflow chip.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Up to 5 avatars rendered inline", completed: true },
            { title: "Overflow shown as +N chip with tooltip listing remaining members", completed: true },
            { title: "Click on avatar filters cards owned by that user", completed: true },
          ],
        },
      ],
      comments: [
        {
          authorEmail: "ewa@example.com",
          body: "Deployed to staging. @Jonasz could you smoke-test the overflow tooltip on Safari?",
          daysAgo: 1,
        },
      ],
    },
    {
      title: "User Story: Comment input under the activity timeline",
      column: "Verify",
      position: 2,
      tagNames: ["Frontend", "Priority: Medium"],
      ownerEmails: ["filip@example.com"],
      descriptionHtml: `<p>Sticky comment composer at the bottom of the card drawer. Cmd/Ctrl+Enter submits.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Textarea autosizes up to 6 lines", completed: true },
            { title: "Cmd+Enter / Ctrl+Enter submits", completed: true },
            { title: "Empty body rejected client-side and server-side", completed: true },
          ],
        },
      ],
    },

    // ---------------- Done ----------------
    {
      title: "Spike: Pick an ORM (Prisma vs Drizzle)",
      column: "Done",
      position: 1,
      tagNames: ["Backend", "Priority: Low"],
      ownerEmails: [MOCK_USER.email],
      descriptionHtml: `<p>Outcome: Prisma. Migration ergonomics + studio outweighed Drizzle's bundle wins for 1.0.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "Decision recorded in CLAUDE.md", completed: true },
            { title: "Initial schema migrated", completed: true },
          ],
        },
      ],
    },
    {
      title: "Epic: Bootstrap repo (Next 15 + Prisma + Tailwind)",
      column: "Done",
      position: 2,
      tagNames: ["Frontend", "Backend", "Platform"],
      ownerEmails: [MOCK_USER.email, "alice@example.com"],
      descriptionHtml: `<p>Initial scaffolding done — App Router, Prisma client singleton, Tailwind v3, eslint, tsx for seed.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "next dev runs locally", completed: true },
            { title: "prisma generate + next build pass on Railway", completed: true },
            { title: "Tailwind config + global stylesheet", completed: true },
          ],
        },
      ],
    },
    {
      title: "User Story: Health check endpoint",
      column: "Done",
      position: 3,
      tagNames: ["Backend", "Platform", "Priority: Low"],
      ownerEmails: ["damian@example.com"],
      descriptionHtml: `<p>GET /api/health returns 200 + version string. Wired up to Railway's healthcheck.</p>`,
      checklists: [
        {
          title: "Acceptance criteria",
          items: [
            { title: "200 response under 100ms", completed: true },
            { title: "Returns build sha + uptime", completed: true },
          ],
        },
      ],
    },
  ];

  await createCards({ cards, columns, tags, users });
}

async function seedOkrBoard(users: UserMap) {
  const { columns, tags } = await createBoard({
    name: "OKRs",
    memberEmails: [
      MOCK_USER.email,
      "alice@example.com",
      "bartek@example.com",
      "damian@example.com",
      "gosia@example.com",
    ],
    columnNames: ["Backlog", "Current", "Done"],
    users,
  });

  const cards: CardSpec[] = [
    // ---------------- Current quarter ----------------
    {
      title: "Q2 2026 — Cut p95 board load time below 300ms",
      column: "Current",
      position: 1,
      tagNames: ["OKR", "Platform", "Priority: High"],
      ownerEmails: [MOCK_USER.email, "damian@example.com"],
      dueDate: daysFromNow(45),
      descriptionHtml: `<p><strong>Objective:</strong> The board view feels instant for every team using us.</p><p>Measured on the dashboard route under a 10-card, 4-column board on a mid-tier laptop on 4G.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: p95 first contentful paint < 300ms on the board route" },
            { title: "KR2: p95 server response time on GET /api/boards/:id < 80ms" },
            { title: "KR3: Lighthouse perf score >= 90 on the dashboard route" },
          ],
        },
      ],
    },
    {
      title: "Q2 2026 — Reach 25 active internal users",
      column: "Current",
      position: 2,
      tagNames: ["OKR", "System App", "Priority: Medium"],
      ownerEmails: [MOCK_USER.email],
      dueDate: daysFromNow(60),
      descriptionHtml: `<p><strong>Objective:</strong> Mamamia Linear is the default tracker for at least three IT squads internally.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: 25 distinct users active in a single week" },
            { title: "KR2: Three squads have migrated their backlog from the old tool" },
            { title: "KR3: NPS from internal pulse survey >= +20" },
          ],
        },
      ],
    },
    {
      title: "Q2 2026 — Ship platform reliability foundations",
      column: "Current",
      position: 3,
      tagNames: ["OKR", "Backend", "Platform", "Priority: High"],
      ownerEmails: ["damian@example.com", "bartek@example.com"],
      dueDate: daysFromNow(80),
      descriptionHtml: `<p><strong>Objective:</strong> When something breaks at 3am, we know within minutes and recover within an hour.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: Error budget burn rate dashboard live in Grafana" },
            { title: "KR2: PagerDuty rotation in place with on-call runbook" },
            { title: "KR3: Mean time to recovery for production incidents < 60min" },
          ],
        },
      ],
    },

    // ---------------- Backlog (future quarters) ----------------
    {
      title: "Q3 2026 — Open the app to external pilot customers",
      column: "Backlog",
      position: 1,
      tagNames: ["OKR", "Priority: High"],
      ownerEmails: [MOCK_USER.email, "alice@example.com"],
      descriptionHtml: `<p><strong>Objective:</strong> Five external teams trying the product weekly by end of Q3.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: Multi-tenant auth shipped" },
            { title: "KR2: Five external pilot teams onboarded" },
            { title: "KR3: At least one pilot signs a paid intent letter" },
          ],
        },
      ],
    },
    {
      title: "Q3 2026 — Make the editing surface delightful",
      column: "Backlog",
      position: 2,
      tagNames: ["OKR", "Frontend", "Priority: Medium"],
      ownerEmails: ["alice@example.com", "celina@example.com"],
      descriptionHtml: `<p><strong>Objective:</strong> Card editing rivals the smoothness of best-in-class trackers.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: Keyboard-only flow to create, tag, assign and close a card" },
            { title: "KR2: Slash commands for tags, owners and due dates" },
            { title: "KR3: Mobile drawer UX user-tested with 5 internal users" },
          ],
        },
      ],
    },
    {
      title: "Q4 2026 — Reporting & exports",
      column: "Backlog",
      position: 3,
      tagNames: ["OKR", "Priority: Low"],
      descriptionHtml: `<p><strong>Objective:</strong> Managers can answer "what shipped this sprint?" without scrolling.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: Sprint report view per board (start/end snapshot)" },
            { title: "KR2: CSV export for any board view" },
            { title: "KR3: At least one report scheduled to email weekly" },
          ],
        },
      ],
    },

    // ---------------- Done (previous quarter) ----------------
    {
      title: "Q1 2026 — Ship a usable internal alpha",
      column: "Done",
      position: 1,
      tagNames: ["OKR", "Priority: High"],
      ownerEmails: [MOCK_USER.email],
      descriptionHtml: `<p><strong>Objective:</strong> Have something the platform team can run their own sprint on.</p><p>Outcome: Achieved on schedule, platform team running their own sprint board since week 11.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: Boards / columns / cards CRUD live", completed: true },
            { title: "KR2: At least one team using the app for real work", completed: true },
            { title: "KR3: Deployed on Railway with daily backups", completed: true },
          ],
        },
      ],
    },
    {
      title: "Q1 2026 — Define the 1.0 scope",
      column: "Done",
      position: 2,
      tagNames: ["OKR", "Priority: Medium"],
      ownerEmails: [MOCK_USER.email, "alice@example.com"],
      descriptionHtml: `<p><strong>Objective:</strong> A 1.0 spec that fits one engineer one quarter.</p>`,
      checklists: [
        {
          title: "Key results",
          items: [
            { title: "KR1: CLAUDE.md committed and reviewed", completed: true },
            { title: "KR2: Data model agreed and migrated", completed: true },
            { title: "KR3: 1.0 guardrails published", completed: true },
          ],
        },
      ],
    },
  ];

  await createCards({ cards, columns, tags, users });
}

async function seedBugBoard(users: UserMap) {
  const { columns, tags } = await createBoard({
    name: "Bug Reporting",
    memberEmails: [
      MOCK_USER.email,
      "alice@example.com",
      "bartek@example.com",
      "celina@example.com",
      "damian@example.com",
      "ewa@example.com",
      "filip@example.com",
      "gosia@example.com",
      "hubert@example.com",
    ],
    columnNames: ["Reported", "TODO", "Verified", "Archive"],
    users,
  });

  const cards: CardSpec[] = [
    // ---------------- Reported ----------------
    {
      title: "Card drawer scrolls behind the sticky comment composer on Safari",
      column: "Reported",
      position: 1,
      tagNames: ["Frontend", "Priority: Medium"],
      descriptionHtml: `<p><strong>Steps:</strong> Open a card with many comments in Safari 17.</p><p><strong>Expected:</strong> Last comment visible above the composer.</p><p><strong>Actual:</strong> The last few comments slide under the composer and can't be scrolled into view.</p>`,
      comments: [
        {
          authorEmail: "ewa@example.com",
          body: "Repro'd on Safari 17.4 / macOS 14. Chrome and Firefox fine.",
          daysAgo: 0,
        },
      ],
    },
    {
      title: "Tag color picker reverts to default after save",
      column: "Reported",
      position: 2,
      tagNames: ["Frontend", "Priority: Low"],
      descriptionHtml: `<p>Pick a non-default color, save the tag, reopen — the swatch is back to gray. Color persists in the DB though, so it's a UI sync bug only.</p>`,
      comments: [
        {
          authorEmail: "filip@example.com",
          body: "Looks like the form's defaultValues aren't refreshing after the mutation.",
          daysAgo: 0,
        },
      ],
    },
    {
      title: "Owner picker shows users from other boards",
      column: "Reported",
      position: 3,
      tagNames: ["Backend", "Priority: High"],
      descriptionHtml: `<p>On the Bug Reporting board, the owner picker offers users who are members only of the Sprint board.</p><p>Suspect the query isn't filtering BoardMember by board_id.</p>`,
      comments: [
        {
          authorEmail: "bartek@example.com",
          body: "Yep — /api/users/search ignores the board scope param. Will pick this up.",
          daysAgo: 1,
        },
      ],
    },
    {
      title: "Drag and drop loses card position after API error",
      column: "Reported",
      position: 4,
      tagNames: ["Frontend", "Priority: High"],
      descriptionHtml: `<p>If the reorder PATCH fails (e.g. 500), the card stays where the user dropped it on screen but the server still has the old order — next refresh snaps it back.</p>`,
      comments: [
        {
          authorEmail: "alice@example.com",
          body: "Need to roll back the optimistic update on failure. Will fix as part of the DnD story.",
          daysAgo: 1,
        },
      ],
    },
    {
      title: "Activity timeline shows duplicate OWNER_ADDED rows",
      column: "Reported",
      position: 5,
      tagNames: ["Backend", "Priority: Medium"],
      descriptionHtml: `<p>Adding an owner sometimes writes two Activity rows. Looks like the mutation runs twice from the client (React StrictMode dev double-invoke?).</p>`,
    },
    {
      title: "Rich text paste from Google Docs leaves stray <span> tags",
      column: "Reported",
      position: 6,
      tagNames: ["Frontend", "Priority: Low"],
      descriptionHtml: `<p>Paste from Google Docs into a card description — sanitize-html strips the styling, but the resulting markup has dozens of empty paragraphs.</p>`,
    },
    {
      title: "Email link in card description doesn't get mailto: scheme",
      column: "Reported",
      position: 7,
      tagNames: ["Frontend", "Priority: Low"],
      descriptionHtml: `<p>Pasting <strong>name@example.com</strong> linkifies to <em>http://name@example.com</em> instead of <em>mailto:</em>.</p>`,
    },

    // ---------------- TODO ----------------
    {
      title: "Health endpoint reports OK while DB is down",
      column: "TODO",
      position: 1,
      tagNames: ["Backend", "Platform", "Priority: Critical"],
      ownerEmails: ["damian@example.com"],
      dueDate: daysFromNow(2),
      descriptionHtml: `<p>GET /api/health returns 200 even when Postgres is unreachable. Need to roundtrip a trivial query before responding.</p>`,
      comments: [
        {
          authorEmail: "damian@example.com",
          body: "Reproduced by pausing the Postgres plugin on Railway. Working on a fix.",
          daysAgo: 1,
        },
      ],
    },
    {
      title: "Long card titles overflow the column header on narrow screens",
      column: "TODO",
      position: 2,
      tagNames: ["Frontend", "Priority: Medium"],
      ownerEmails: ["celina@example.com"],
      dueDate: daysFromNow(4),
      descriptionHtml: `<p>Titles >40 chars push the column wider on screens below ~1100px. Should ellipsize at 2 lines.</p>`,
    },
    {
      title: "Cannot remove the last owner from a card",
      column: "TODO",
      position: 3,
      tagNames: ["Backend", "Priority: Medium"],
      ownerEmails: ["bartek@example.com"],
      descriptionHtml: `<p>The DELETE /api/cards/:id/owners/:userId returns 409 when removing the only remaining owner. Product wants this allowed — unassigned cards are a valid state.</p>`,
    },
    {
      title: "Checklist item due date timezone off by one day",
      column: "TODO",
      position: 4,
      tagNames: ["Frontend", "Backend", "Priority: High"],
      ownerEmails: ["filip@example.com"],
      dueDate: daysFromNow(3),
      descriptionHtml: `<p>Setting a due date of 2026-06-10 from a UTC-7 browser stores 2026-06-09 in the DB. Need to send the date as a date-only string and store it normalized to UTC midday.</p>`,
    },
    {
      title: "Sidebar collapse state not persisted across reloads",
      column: "TODO",
      position: 5,
      tagNames: ["Frontend", "Priority: Low"],
      ownerEmails: ["alice@example.com"],
      descriptionHtml: `<p>Collapsed sidebar re-expands on hard reload. Should read from localStorage on mount.</p>`,
    },

    // ---------------- Verified ----------------
    {
      title: "Tag added to wrong board's tag pool",
      column: "Verified",
      position: 1,
      tagNames: ["Backend", "Priority: High"],
      ownerEmails: ["bartek@example.com"],
      descriptionHtml: `<p>Creating a tag while on Board A but with Board B's id sent in the request body inserted the tag under Board B.</p><p><strong>Fix:</strong> server now ignores client-supplied board_id and derives it from the route param.</p>`,
      comments: [
        {
          authorEmail: "gosia@example.com",
          body: "Verified on staging — picker shows correct tags now.",
          daysAgo: 1,
        },
      ],
    },
    {
      title: "Activity rows missing actor_user_id on checklist toggles",
      column: "Verified",
      position: 2,
      tagNames: ["Backend", "Priority: Medium"],
      ownerEmails: ["damian@example.com"],
      descriptionHtml: `<p>Toggling a checklist item logged an Activity row, but actor_user_id was the system user, not the current user.</p><p><strong>Fix:</strong> handler now reads actor from <code>getCurrentUser()</code>.</p>`,
    },
    {
      title: "Card drawer wouldn't close after using Esc inside editor",
      column: "Verified",
      position: 3,
      tagNames: ["Frontend", "Priority: Low"],
      ownerEmails: ["celina@example.com"],
      descriptionHtml: `<p>Tiptap was swallowing the Esc key. Now bubbles up when the editor isn't in a special mode.</p>`,
    },

    // ---------------- Archive ----------------
    {
      title: "Build broken on Node 18 (Prisma 5 requires Node 20)",
      column: "Archive",
      position: 1,
      tagNames: ["Backend", "Platform"],
      descriptionHtml: `<p>Resolved by setting <code>engines.node = ">=20"</code> and bumping the Railway runtime.</p>`,
    },
    {
      title: "Stale prisma client in production after migration",
      column: "Archive",
      position: 2,
      tagNames: ["Backend", "Platform"],
      descriptionHtml: `<p>Pre-deploy command updated to run <code>prisma migrate deploy</code> before container start. No longer reproducible.</p>`,
    },
    {
      title: "Tailwind classes purged in production but not in dev",
      column: "Archive",
      position: 3,
      tagNames: ["Frontend"],
      descriptionHtml: `<p>Content globs didn't include /components. Fixed in tailwind.config.ts.</p>`,
    },
    {
      title: "Migration 0003 attempted to drop a non-existent column",
      column: "Archive",
      position: 4,
      tagNames: ["Backend"],
      descriptionHtml: `<p>Hand-edited migration superseded by 0004 which created the column properly. Marking as won't fix on 0003.</p>`,
    },
  ];

  await createCards({ cards, columns, tags, users });
}

async function main() {
  console.log("Seeding…");
  await wipeBoards();
  const { mockUserId, users } = await upsertUsers();
  await seedSprintBoard(users);
  await seedOkrBoard(users);
  await seedBugBoard(users);

  console.log("Seed complete.");
  console.log(`MOCK_USER_ID=${mockUserId}`);
  console.log(
    "Copy that id into the Railway web service's MOCK_USER_ID variable and redeploy.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
