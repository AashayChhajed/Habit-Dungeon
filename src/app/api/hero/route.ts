import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_USER_ID = "hero-default-id";

// Helper to seed database if empty
async function getOrCreateHero() {
  let user = await db.user.findUnique({
    where: { id: DEFAULT_USER_ID },
    include: { activeBoss: true },
  });

  if (!user) {
    // Create default user, boss, and initial habits
    user = await db.user.create({
      data: {
        id: DEFAULT_USER_ID,
        username: "Valiant Hero",
        level: 1,
        xp: 0,
        gold: 10,
        hp: 100,
        maxHp: 100,
        activeBoss: {
          create: {
            name: "Prisma Slime",
            currentHp: 50,
            maxHp: 50,
            imageUrl: "/bosses/slime.png",
          },
        },
        habits: {
          create: [
            { title: "Drink 8 glasses of water", difficulty: "EASY" },
            { title: "Complete coding challenges", difficulty: "MEDIUM" },
            { title: "Hit the gym for 45 mins", difficulty: "HARD" },
          ],
        },
      },
      include: { activeBoss: true },
    });
  }

  return user;
}

export async function GET() {
  try {
    const hero = await getOrCreateHero();
    return NextResponse.json(hero);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "resurrect") {
      const hero = await db.user.findUnique({
        where: { id: DEFAULT_USER_ID },
        include: { activeBoss: true },
      });

      if (!hero) {
        return NextResponse.json({ error: "Hero not found" }, { status: 404 });
      }

      if (hero.hp > 0) {
        return NextResponse.json({ error: "Hero is not dead!" }, { status: 400 });
      }

      // Resurrect costs: lose 20% of gold and 20% of current XP
      const goldCost = Math.floor(hero.gold * 0.2);
      const xpCost = Math.floor(hero.xp * 0.2);

      const updatedHero = await db.user.update({
        where: { id: DEFAULT_USER_ID },
        data: {
          hp: hero.maxHp,
          gold: Math.max(0, hero.gold - goldCost),
          xp: Math.max(0, hero.xp - xpCost),
        },
        include: { activeBoss: true },
      });

      return NextResponse.json({
        message: "Resurrected!",
        hero: updatedHero,
        penalties: { goldLost: goldCost, xpLost: xpCost },
      });
    }

    if (action === "reset") {
      await db.habit.updateMany({
        where: { userId: DEFAULT_USER_ID },
        data: { isCompleted: false }
      });

      await db.activeBoss.deleteMany({
        where: { userId: DEFAULT_USER_ID }
      });

      const updatedHero = await db.user.update({
        where: { id: DEFAULT_USER_ID },
        data: {
          level: 1,
          xp: 0,
          gold: 10,
          hp: 100,
          maxHp: 100,
          activeBoss: {
            create: {
              name: "Prisma Slime",
              maxHp: 50,
              currentHp: 50,
              imageUrl: "/bosses/slime.png"
            }
          }
        },
        include: { activeBoss: true }
      });

      return NextResponse.json({
        message: "Character reset successful!",
        hero: updatedHero
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
