import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_USER_ID = "hero-default-id";

// Boss Templates
const BOSS_TEMPLATES = [
  { name: "Prisma Slime", baseHp: 50, imageUrl: "/bosses/slime.png" },
  { name: "Goblin Raider", baseHp: 100, imageUrl: "/bosses/goblin.png" },
  { name: "Skeleton Knight", baseHp: 180, imageUrl: "/bosses/skeleton.png" },
  { name: "Cave Troll", baseHp: 300, imageUrl: "/bosses/troll.png" },
  { name: "Fire Drake", baseHp: 500, imageUrl: "/bosses/dragon.png" },
  { name: "Lich Lord", baseHp: 800, imageUrl: "/bosses/lich.png" },
  { name: "Void Demon", baseHp: 1200, imageUrl: "/bosses/demon.png" },
];

// XP required to level up: level * 100
function getXpRequired(level: number) {
  return level * 100;
}

// Stats mapping by difficulty
const DIFFICULTY_STATS = {
  EASY: { damage: 10, xp: 10, gold: 5, penalty: 5 },
  MEDIUM: { damage: 20, xp: 25, gold: 15, penalty: 12 },
  HARD: { damage: 45, xp: 60, gold: 40, penalty: 30 },
};

export async function POST(req: Request) {
  try {
    const { action, habitId } = await req.json();

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    // Retrieve current hero state
    const hero = await db.user.findUnique({
      where: { id: DEFAULT_USER_ID },
      include: { activeBoss: true },
    });

    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 });
    }

    if (hero.hp <= 0 && action !== "resurrect") {
      return NextResponse.json({ error: "Hero is dead! You must resurrect first." }, { status: 400 });
    }

    // ==========================================
    // ACTION: COMPLETE (Attack Boss)
    // ==========================================
    if (action === "complete") {
      if (!habitId) {
        return NextResponse.json({ error: "Habit ID required" }, { status: 400 });
      }

      const habit = await db.habit.findUnique({
        where: { id: habitId },
      });

      if (!habit || habit.userId !== DEFAULT_USER_ID) {
        return NextResponse.json({ error: "Habit not found" }, { status: 404 });
      }

      if (habit.isCompleted) {
        return NextResponse.json({ error: "Habit is already completed" }, { status: 400 });
      }

      const stats = DIFFICULTY_STATS[habit.difficulty as keyof typeof DIFFICULTY_STATS] || DIFFICULTY_STATS.EASY;

      // Update habit as completed
      await db.habit.update({
        where: { id: habitId },
        data: { isCompleted: true },
      });

      let boss = hero.activeBoss;
      if (!boss) {
        // Fallback spawn if somehow missing
        boss = await db.activeBoss.create({
          data: {
            name: "Prisma Slime",
            currentHp: 50,
            maxHp: 50,
            imageUrl: "/bosses/slime.png",
            userId: DEFAULT_USER_ID,
          },
        });
      }

      // Calculate combat details
      const damageDealt = stats.damage;
      const goldGained = stats.gold;
      const xpGained = stats.xp;

      let newBossHp = Math.max(0, boss.currentHp - damageDealt);
      let bossDefeated = false;
      let bossLootGold = 0;
      let bossLootXp = 0;
      let nextBoss = null;

      // Handle boss defeat
      if (newBossHp <= 0) {
        bossDefeated = true;
        // Boss loot scale with hero level
        bossLootGold = hero.level * 20;
        bossLootXp = hero.level * 35;

        // Choose new random boss template
        const template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
        
        // Scale boss HP based on hero level
        const scaleFactor = 1 + (hero.level - 1) * 0.15;
        const newMaxHp = Math.floor(template.baseHp * scaleFactor);

        // Update active boss in db
        nextBoss = await db.activeBoss.update({
          where: { userId: DEFAULT_USER_ID },
          data: {
            name: template.name,
            maxHp: newMaxHp,
            currentHp: newMaxHp,
            imageUrl: template.imageUrl,
          },
        });
      } else {
        // Just update HP
        nextBoss = await db.activeBoss.update({
          where: { userId: DEFAULT_USER_ID },
          data: { currentHp: newBossHp },
        });
      }

      // Add rewards to Hero and check for Level Up
      let totalXp = hero.xp + xpGained + bossLootXp;
      let totalGold = hero.gold + goldGained + bossLootGold;
      let level = hero.level;
      let maxHp = hero.maxHp;
      let currentHp = hero.hp;
      let leveledUp = false;

      while (totalXp >= getXpRequired(level)) {
        totalXp -= getXpRequired(level);
        level += 1;
        maxHp += 10;
        currentHp = maxHp; // Full heal on level up
        leveledUp = true;
      }

      // Update hero in database
      const updatedHero = await db.user.update({
        where: { id: DEFAULT_USER_ID },
        data: {
          xp: totalXp,
          gold: totalGold,
          level,
          maxHp,
          hp: currentHp,
        },
        include: { activeBoss: true },
      });

      return NextResponse.json({
        success: true,
        combat: {
          damageDealt,
          goldGained,
          xpGained,
          bossDefeated,
          bossLootGold,
          bossLootXp,
          leveledUp,
        },
        hero: updatedHero,
      });
    }

    // ==========================================
    // ACTION: UNCOMPLETE (Revert Attack)
    // ==========================================
    if (action === "uncomplete") {
      if (!habitId) {
        return NextResponse.json({ error: "Habit ID required" }, { status: 400 });
      }

      const habit = await db.habit.findUnique({
        where: { id: habitId },
      });

      if (!habit || habit.userId !== DEFAULT_USER_ID) {
        return NextResponse.json({ error: "Habit not found" }, { status: 404 });
      }

      if (!habit.isCompleted) {
        return NextResponse.json({ error: "Habit is not completed" }, { status: 400 });
      }

      const stats = DIFFICULTY_STATS[habit.difficulty as keyof typeof DIFFICULTY_STATS] || DIFFICULTY_STATS.EASY;

      // Update habit as incomplete
      await db.habit.update({
        where: { id: habitId },
        data: { isCompleted: false },
      });

      let boss = hero.activeBoss;
      if (!boss) {
        return NextResponse.json({ error: "Boss not found" }, { status: 404 });
      }

      // Reverse rewards and boss damage
      // Note: We don't de-level the player to avoid frustration, we just cap min XP to 0
      const xpLost = stats.xp;
      const goldLost = stats.gold;
      const bossHealed = stats.damage;

      const newBossHp = Math.min(boss.maxHp, boss.currentHp + bossHealed);

      const updatedBoss = await db.activeBoss.update({
        where: { userId: DEFAULT_USER_ID },
        data: { currentHp: newBossHp },
      });

      const updatedHero = await db.user.update({
        where: { id: DEFAULT_USER_ID },
        data: {
          xp: Math.max(0, hero.xp - xpLost),
          gold: Math.max(0, hero.gold - goldLost),
        },
        include: { activeBoss: true },
      });

      return NextResponse.json({
        success: true,
        combat: {
          bossHealed,
          xpLost,
          goldLost,
        },
        hero: updatedHero,
      });
    }

    // ==========================================
    // ACTION: END DAY (Boss Counter-Attacks)
    // ==========================================
    if (action === "endDay") {
      // Find all incomplete habits
      const incompleteHabits = await db.habit.findMany({
        where: {
          userId: DEFAULT_USER_ID,
          isCompleted: false,
        },
      });

      let damageTaken = 0;
      incompleteHabits.forEach((habit) => {
        const stats = DIFFICULTY_STATS[habit.difficulty as keyof typeof DIFFICULTY_STATS] || DIFFICULTY_STATS.EASY;
        damageTaken += stats.penalty;
      });

      let flawlessBonus = false;
      let xpBonus = 0;
      let goldBonus = 0;

      if (incompleteHabits.length === 0) {
        // Flawless day rewards
        flawlessBonus = true;
        xpBonus = hero.level * 15;
        goldBonus = hero.level * 10;
      }

      // Calculate new Hero HP
      let newHeroHp = hero.hp;
      let totalXp = hero.xp;
      let totalGold = hero.gold;
      let level = hero.level;
      let maxHp = hero.maxHp;
      let leveledUp = false;

      if (flawlessBonus) {
        totalXp += xpBonus;
        totalGold += goldBonus;

        while (totalXp >= getXpRequired(level)) {
          totalXp -= getXpRequired(level);
          level += 1;
          maxHp += 10;
          newHeroHp = maxHp; // Full heal on level up
          leveledUp = true;
        }
      } else {
        newHeroHp = Math.max(0, hero.hp - damageTaken);
      }

      // Reset all habits for the next day
      const resetResult = await db.habit.updateMany({
        where: { userId: DEFAULT_USER_ID },
        data: { isCompleted: false },
      });

      const updatedHero = await db.user.update({
        where: { id: DEFAULT_USER_ID },
        data: {
          hp: newHeroHp,
          xp: totalXp,
          gold: totalGold,
          level,
          maxHp,
        },
        include: { activeBoss: true },
      });

      return NextResponse.json({
        success: true,
        summary: {
          damageTaken,
          habitsResetCount: resetResult.count,
          flawlessBonus,
          xpBonus,
          goldBonus,
          heroDied: newHeroHp === 0,
          leveledUp,
        },
        hero: updatedHero,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
