import { PrismaClient } from "@prisma/client";

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
];

async function main() {
  const mock = await prisma.user.upsert({
    where: { email: MOCK_USER.email },
    update: { name: MOCK_USER.name },
    create: MOCK_USER,
  });

  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: u,
    });
  }

  console.log("Seed complete.");
  console.log(`MOCK_USER_ID=${mock.id}`);
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
