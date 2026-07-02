"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Swords, 
  Heart, 
  Award, 
  Coins, 
  Plus, 
  Trash2, 
  Skull, 
  Sun, 
  Sparkles, 
  RefreshCw, 
  Flame, 
  ShieldAlert, 
  Trophy,
  History
} from "lucide-react";

interface Habit {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isCompleted: boolean;
}

interface ActiveBoss {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  imageUrl: string;
}

interface Hero {
  id: string;
  username: string;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  maxHp: number;
  activeBoss: ActiveBoss | null;
}

interface FloatingText {
  id: string;
  text: string;
  colorClass: string;
}

export default function HabitDungeon() {
  const [hero, setHero] = useState<Hero | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [victoryOpen, setVictoryOpen] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  
  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  
  // Game Event states
  const [loot, setLoot] = useState({ gold: 0, xp: 0 });
  const [bossShake, setBossShake] = useState(false);
  const [bossFlash, setBossFlash] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  
  // Action Pending
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const heroRes = await fetch("/api/hero");
        const heroData = await heroRes.json();
        if (heroData && !heroData.error) {
          setHero(heroData);
        } else {
          console.error("Hero loading error:", heroData?.error);
        }

        const habitsRes = await fetch("/api/habits");
        const habitsData = await habitsRes.json();
        if (Array.isArray(habitsData)) {
          setHabits(habitsData);
        } else {
          console.error("Habits loading error:", habitsData?.error);
        }

        setCombatLogs(["Welcome to Habit Dungeon! Check your habits to attack the boss."]);
      } catch (err) {
        console.error("Error loading initial data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const addFloatingText = (text: string, colorClass: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setFloatingTexts(prev => [...prev, { id, text, colorClass }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1500);
  };

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCombatLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Complete / Uncomplete Habit
  const handleToggleHabit = async (habit: Habit) => {
    if (!hero || isSubmitting) return;

    if (hero.hp <= 0) {
      addFloatingText("You are dead!", "text-red-500 font-bold");
      return;
    }

    setIsSubmitting(true);
    const originalIsCompleted = habit.isCompleted;

    // Optimistically update habits list
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, isCompleted: !originalIsCompleted } : h));

    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: originalIsCompleted ? "uncomplete" : "complete",
          habitId: habit.id
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setHero(data.hero);

      if (!originalIsCompleted) {
        // Complete (Hero Attacked!)
        setBossShake(true);
        setBossFlash(true);
        setTimeout(() => {
          setBossShake(false);
          setBossFlash(false);
        }, 400);

        const { damageDealt, goldGained, xpGained, bossDefeated, bossLootGold, bossLootXp, leveledUp } = data.combat;
        
        addFloatingText(`-${damageDealt} HP`, "text-red-500 font-pixel text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]");
        setTimeout(() => addFloatingText(`+${goldGained} Gold`, "text-yellow-400 font-semibold"), 200);
        setTimeout(() => addFloatingText(`+${xpGained} XP`, "text-cyan-400 font-semibold"), 400);

        addLog(`You struck the ${hero.activeBoss?.name} for ${damageDealt} damage! (+${goldGained} Gold, +${xpGained} XP)`);

        if (bossDefeated) {
          setLoot({ gold: bossLootGold, xp: bossLootXp });
          setVictoryOpen(true);
          addLog(`⚔️ VICTORY! You defeated the ${hero.activeBoss?.name}! Received bonus loot: +${bossLootGold} Gold, +${bossLootXp} XP.`);
        }

        if (leveledUp) {
          setTimeout(() => {
            setLevelUpOpen(true);
            addFloatingText("LEVEL UP!", "text-yellow-300 font-pixel font-bold text-lg animate-pulse");
          }, 800);
          addLog(`✨ LEVEL UP! You reached Level ${data.hero.level}! Your HP has been fully restored.`);
        }
      } else {
        // Uncomplete (Healed boss / reversed rewards)
        const { bossHealed, xpLost, goldLost } = data.combat;
        addFloatingText(`+${bossHealed} HP (Boss)`, "text-green-400 font-semibold");
        addLog(`Reverted habit: ${habit.title}. Boss healed for ${bossHealed} HP. (-${goldLost} Gold, -${xpLost} XP)`);
      }

    } catch (err: any) {
      console.error(err);
      // Revert optimistic update
      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, isCompleted: originalIsCompleted } : h));
      addLog(`⚠️ Combat error: ${err.message || "Failed to update"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Habit
  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, difficulty: newDifficulty })
      });
      if (res.ok) {
        const habit = await res.json();
        setHabits(prev => [habit, ...prev]);
        setNewTitle("");
        setAddDialogOpen(false);
        addLog(`Added new habit: "${habit.title}" (${habit.difficulty})`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Habit
  const handleDeleteHabit = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHabits(prev => prev.filter(h => h.id !== id));
        addLog(`Deleted habit: "${title}"`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // End Day
  const handleEndDay = async () => {
    if (!hero || isSubmitting) return;

    const confirmEnd = window.confirm("Are you sure you want to end the day? This will reset all habits, and any incomplete habits will damage your hero!");
    if (!confirmEnd) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "endDay" })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setHero(data.hero);
      setHabits(prev => prev.map(h => ({ ...h, isCompleted: false })));

      const { damageTaken, habitsResetCount, flawlessBonus, xpBonus, goldBonus, heroDied, leveledUp } = data.summary;

      if (flawlessBonus) {
        addFloatingText("FLAWLESS DAY!", "text-yellow-400 font-pixel font-bold");
        addLog(`🌟 FLAWLESS DAY! All habits completed! Bonus: +${xpBonus} XP, +${goldBonus} Gold.`);
        if (leveledUp) {
          setLevelUpOpen(true);
          addLog(`✨ LEVEL UP! You reached Level ${data.hero.level}!`);
        }
      } else {
        addFloatingText(`-${damageTaken} HP (Hero)`, "text-red-500 font-pixel font-bold");
        addLog(`💤 Ended day. ${habitsResetCount} habits reset. You took ${damageTaken} damage from incomplete tasks.`);
        if (heroDied) {
          addLog(`💀 You have been defeated in battle! Resurrect to restore your health.`);
        }
      }

    } catch (err: any) {
      console.error(err);
      addLog(`⚠️ End Day error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resurrect Hero
  const handleResurrect = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resurrect" })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setHero(data.hero);
      addLog(`💖 Resurrected! Restored full health at the cost of ${data.penalties.goldLost} Gold and ${data.penalties.xpLost} XP.`);

    } catch (err: any) {
      console.error(err);
      addLog(`⚠️ Resurrection error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Character
  const handleResetCharacter = async () => {
    const confirmReset = window.confirm("Are you sure you want to reset your character level, stats, and boss progress? This cannot be undone!");
    if (!confirmReset) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setHero(data.hero);
      setHabits(prev => prev.map(h => ({ ...h, isCompleted: false })));
      addLog("♻️ Character reset! Returned to Level 1 and resurrected Prisma Slime.");

    } catch (err: any) {
      console.error(err);
      addLog(`⚠️ Reset error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-cinzel text-lg tracking-widest animate-pulse">Entering Dungeon...</p>
      </div>
    );
  }

  const xpNeeded = hero ? hero.level * 100 : 100;
  const xpPercent = hero ? Math.min(100, (hero.xp / xpNeeded) * 100) : 0;
  const hpPercent = hero ? Math.min(100, (hero.hp / hero.maxHp) * 100) : 0;
  const bossHpPercent = hero?.activeBoss ? Math.min(100, (hero.activeBoss.currentHp / hero.activeBoss.maxHp) * 100) : 0;
  const isHeroDead = hero ? hero.hp <= 0 : false;

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col justify-between relative">
      {/* HEADER */}
      <header className="text-center mb-8 border-b border-zinc-800 pb-6 relative">
        <h1 className="font-cinzel text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-500 to-yellow-500 tracking-wider drop-shadow-md select-none">
          HABIT DUNGEON
        </h1>
        <p className="text-zinc-400 mt-2 font-light text-sm md:text-base">
          Slay your tasks. Level up your life.
        </p>
      </header>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1">
        
        {/* LEFT COLUMN: HERO STATS */}
        <section className="lg:col-span-3 flex flex-col gap-6">
          <div className="rpg-panel rpg-panel-glow-cyan p-6 flex flex-col gap-5 flex-1 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <Award className="w-6 h-6 text-cyan-400 animate-pulse" />
              <h2 className="font-cinzel text-xl font-bold tracking-wide">Hero Status</h2>
            </div>

            {/* Username & Level */}
            <div>
              <div className="text-zinc-400 text-xs uppercase tracking-wider">Adventurer</div>
              <div className="font-bold text-lg text-zinc-100 truncate">{hero?.username}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-pixel">LV {hero?.level}</span>
              </div>
            </div>

            {/* HP Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-red-400 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-red-500/20" /> HP
                </span>
                <span className="text-zinc-300">{hero?.hp} / {hero?.maxHp}</span>
              </div>
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${hpPercent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* XP Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-cyan-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> XP
                </span>
                <span className="text-zinc-300">{hero?.xp} / {xpNeeded}</span>
              </div>
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Gold coins */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 flex justify-between items-center mt-2">
              <span className="text-zinc-400 text-sm font-medium flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" /> Wallet Gold
              </span>
              <motion.span 
                key={hero?.gold} 
                animate={{ scale: [1, 1.2, 1] }} 
                className="font-pixel text-amber-400 text-sm font-bold"
              >
                {hero?.gold}g
              </motion.span>
            </div>

            {/* Quick Tips */}
            <div className="mt-auto border-t border-zinc-800/60 pt-4 text-xs text-zinc-500 leading-relaxed space-y-1.5 font-medium">
              <p>💡 Easy: deal 10 dmg (+5g, +10xp)</p>
              <p>💡 Medium: deal 20 dmg (+15g, +25xp)</p>
              <p>💡 Hard: deal 45 dmg (+40g, +60xp)</p>
              
              <button
                onClick={handleResetCharacter}
                disabled={isSubmitting}
                className="w-full mt-4 text-[10px] uppercase tracking-wider font-semibold border border-zinc-800 hover:border-red-900/60 hover:text-red-400 bg-zinc-900/40 py-2 rounded-lg cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                Reset Character
              </button>
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: BATTLE ARENA */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="rpg-panel rpg-panel-glow-red p-6 flex flex-col justify-between flex-1 min-h-[420px] relative overflow-hidden">
            {/* Combat Overlay Warning if Dead */}
            {isHeroDead && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
                <Skull className="w-16 h-16 text-red-500 animate-bounce mb-3" />
                <h3 className="font-cinzel text-2xl font-bold text-red-500 uppercase tracking-widest">You Have Fallen</h3>
                <p className="text-zinc-400 text-sm max-w-xs mt-2 mb-6">
                  The dungeon claimed your soul. Resurrect to restore your vitality and continue the battle.
                </p>
                <button
                  onClick={handleResurrect}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 px-6 rounded-lg shadow-lg hover:shadow-red-500/30 transition flex items-center gap-2 cursor-pointer font-cinzel tracking-wider text-sm active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSubmitting ? "animate-spin" : ""}`} />
                  Resurrect Hero
                </button>
              </div>
            )}

            {/* Boss Stats Header */}
            <div>
              <div className="flex justify-between items-start gap-4 mb-2">
                <div>
                  <span className="text-xs bg-red-950 border border-red-900 text-red-400 px-2.5 py-0.5 rounded font-pixel tracking-tighter inline-flex items-center gap-1 uppercase">
                    <Flame className="w-3 h-3 animate-pulse" /> Active Boss
                  </span>
                  <h3 className="font-cinzel text-2xl font-extrabold text-zinc-100 tracking-wide mt-1.5">
                    {hero?.activeBoss?.name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 font-semibold">Boss HP</div>
                  <div className="font-pixel text-red-400 text-xs mt-1">
                    {hero?.activeBoss?.currentHp} / {hero?.activeBoss?.maxHp}
                  </div>
                </div>
              </div>
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-3 overflow-hidden p-0.5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-red-700 via-red-600 to-orange-500 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${bossHpPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Battle Arena Visualization */}
            <div className="flex-1 flex items-center justify-center relative py-6">
              {/* Floating Damage & Reward Text */}
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex items-center justify-center">
                <AnimatePresence>
                  {floatingTexts.map(text => (
                    <motion.div
                      key={text.id}
                      initial={{ opacity: 1, y: 0, scale: 0.8 }}
                      animate={{ opacity: [1, 1, 0], y: -80, scale: [1, 1.2, 0.9] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`absolute font-bold text-center ${text.colorClass} select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]`}
                    >
                      {text.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Boss Sprite Card */}
              <div className="relative group select-none">
                {/* Radial back-glow for boss */}
                <div className="absolute inset-0 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-700 pointer-events-none"></div>
                
                {hero?.activeBoss?.imageUrl && (
                  <motion.img
                    src={hero.activeBoss.imageUrl}
                    alt={hero.activeBoss.name}
                    className={`w-44 h-44 object-contain rounded-xl relative z-10 transition-all duration-300 
                      ${bossShake ? "animate-shake" : ""} 
                      ${bossFlash ? "animate-flash-red" : ""}`}
                    style={{ imageRendering: "pixelated" }}
                    animate={isHeroDead ? { filter: "grayscale(1) contrast(0.8)" } : {}}
                  />
                )}
              </div>
            </div>

            {/* Combat Action Buttons / Summary */}
            <div className="flex items-center gap-3 mt-4 border-t border-zinc-800/80 pt-4">
              <button
                onClick={handleEndDay}
                disabled={isSubmitting || isHeroDead}
                className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 hover:text-red-400 text-zinc-300 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer font-cinzel text-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sun className="w-4 h-4 text-orange-400" />
                End Day (Rest)
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: HABITS LIST */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="rpg-panel rpg-panel-glow-gold p-6 flex flex-col gap-4 flex-1 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-500" />
                <h2 className="font-cinzel text-xl font-bold tracking-wide">Dungeon Quests</h2>
              </div>
              <button
                onClick={() => setAddDialogOpen(true)}
                disabled={isHeroDead}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-amber-400 hover:text-amber-300 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add Habit"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Habits List */}
            <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-3">
              {habits.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center text-zinc-500 text-sm">
                  <p>Your quest log is empty.</p>
                  <button 
                    onClick={() => setAddDialogOpen(true)}
                    className="text-amber-500 hover:underline mt-2 cursor-pointer"
                  >
                    Create your first habit!
                  </button>
                </div>
              ) : (
                habits.map(habit => {
                  let diffColor = "bg-zinc-800 text-zinc-400";
                  if (habit.difficulty === "EASY") diffColor = "bg-green-950/60 text-green-400 border border-green-900/60";
                  if (habit.difficulty === "MEDIUM") diffColor = "bg-yellow-950/60 text-yellow-400 border border-yellow-900/60";
                  if (habit.difficulty === "HARD") diffColor = "bg-red-950/60 text-red-400 border border-red-900/60";

                  return (
                    <motion.div
                      layout
                      key={habit.id}
                      className={`flex justify-between items-center gap-3 p-3.5 rounded-xl border transition-all duration-300
                        ${habit.isCompleted 
                          ? "bg-zinc-900/40 border-zinc-900/80 opacity-60 line-through text-zinc-500" 
                          : "bg-zinc-900/90 border-zinc-800/80 text-zinc-100 hover:border-zinc-700/80"}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={habit.isCompleted}
                          onChange={() => handleToggleHabit(habit)}
                          disabled={isSubmitting || isHeroDead}
                          className="rpg-checkbox flex-shrink-0"
                        />
                        <span className="font-medium text-sm md:text-base leading-tight truncate">
                          {habit.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-pixel tracking-tighter px-2 py-0.5 rounded uppercase ${diffColor}`}>
                          {habit.difficulty}
                        </span>
                        <button
                          onClick={() => handleDeleteHabit(habit.id, habit.title)}
                          disabled={isSubmitting}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800/50 transition cursor-pointer active:scale-95"
                          title="Delete Habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {/* COMBAT LOGS PANEL */}
      <section className="mt-8 border border-zinc-800 bg-zinc-900/30 backdrop-blur-md rounded-xl p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 text-zinc-400 border-b border-zinc-800 pb-2 mb-3">
          <History className="w-4 h-4 text-zinc-400" />
          <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider">Combat Log</h3>
        </div>
        <div className="h-28 overflow-y-auto text-xs font-mono space-y-1.5 pr-2 select-text">
          {combatLogs.map((log, i) => (
            <div 
              key={i} 
              className={`leading-relaxed ${
                log.includes("VICTORY") ? "text-yellow-400 font-bold" :
                log.includes("LEVEL UP") ? "text-cyan-400 font-bold" :
                log.includes("💀") ? "text-red-500 font-bold" :
                log.includes("reverted") ? "text-zinc-500" :
                i === 0 ? "text-zinc-200" : "text-zinc-400"
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </section>

      {/* MODAL: ADD HABIT DIALOG */}
      <AnimatePresence>
        {addDialogOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500"></div>
              
              <h3 className="font-cinzel text-xl font-bold text-zinc-100 mb-4 tracking-wider flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" /> Forge New Quest
              </h3>

              <form onSubmit={handleAddHabit} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1.5 font-medium">Quest Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Meditate for 10 minutes"
                    className="w-full bg-zinc-955 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2 font-medium">Difficulty Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["EASY", "MEDIUM", "HARD"].map((diff) => {
                      let activeStyle = "";
                      if (diff === "EASY") activeStyle = "border-green-600 bg-green-950/20 text-green-400";
                      if (diff === "MEDIUM") activeStyle = "border-yellow-600 bg-yellow-950/20 text-yellow-400";
                      if (diff === "HARD") activeStyle = "border-red-600 bg-red-950/20 text-red-400";

                      return (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setNewDifficulty(diff as any)}
                          className={`py-2 px-3 rounded-lg border text-xs font-pixel tracking-tighter uppercase transition cursor-pointer text-center
                            ${newDifficulty === diff 
                              ? activeStyle 
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"}`}
                        >
                          {diff}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setAddDialogOpen(false)}
                    className="w-1/2 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 py-2.5 px-4 rounded-xl transition cursor-pointer text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-amber-600 hover:bg-amber-500 text-white py-2.5 px-4 rounded-xl shadow-lg shadow-amber-950/40 hover:shadow-amber-500/20 transition cursor-pointer text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    Forge Quest
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: VICTORY DIALOG */}
      <AnimatePresence>
        {victoryOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
              className="w-full max-w-md bg-zinc-900 border border-yellow-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center relative overflow-hidden"
            >
              {/* Confetti particles back effect using gradients */}
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce mb-4" />

              <h2 className="font-cinzel text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 tracking-wider">
                VICTORY DECLARED!
              </h2>
              
              <p className="text-zinc-300 text-sm mt-3 leading-relaxed max-w-sm mx-auto">
                You fought valiantly and defeated the boss. The dungeon echoes with songs of your triumph!
              </p>

              {/* Loot Rewards */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 my-6 flex justify-around items-center">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-zinc-500 font-semibold uppercase mb-1">XP Gained</span>
                  <span className="text-cyan-400 font-pixel text-sm font-bold flex items-center gap-1">
                    +{loot.xp}
                  </span>
                </div>
                <div className="h-8 w-px bg-zinc-800"></div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-zinc-500 font-semibold uppercase mb-1">Gold Looted</span>
                  <span className="text-yellow-400 font-pixel text-sm font-bold flex items-center gap-1">
                    +{loot.gold}g
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-400 font-light mb-6">
                Next boss is approaching... Keep completing your habits to prepare!
              </div>

              <button
                onClick={() => setVictoryOpen(false)}
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-yellow-500/20 transition cursor-pointer font-cinzel tracking-wider active:scale-95"
              >
                Claim Loot & Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY: LEVEL UP DIALOG */}
      <AnimatePresence>
        {levelUpOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-cyan-500/50 rounded-2xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.15)] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500"></div>

              <Sparkles className="w-14 h-14 text-cyan-400 mx-auto animate-pulse mb-3" />

              <h2 className="font-cinzel text-2xl font-black text-cyan-400 tracking-wider">
                HERO LEVEL UP!
              </h2>

              <p className="text-zinc-300 text-sm mt-3 leading-relaxed">
                Your character has attained new heights of power!
              </p>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 my-5 flex flex-col gap-2.5 text-left text-sm">
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-500">New Rank</span>
                  <span className="font-pixel text-xs bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded">LV {hero?.level}</span>
                </div>
                <div className="w-full h-px bg-zinc-800/80"></div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-500">Max Health Increased</span>
                  <span className="font-semibold text-red-400 flex items-center gap-1">
                    +10 Max HP ({hero?.maxHp} Total)
                  </span>
                </div>
                <div className="w-full h-px bg-zinc-800/80"></div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-500">Health Restored</span>
                  <span className="font-semibold text-green-400">100% Fully Healed</span>
                </div>
              </div>

              <button
                onClick={() => setLevelUpOpen(false)}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition cursor-pointer font-cinzel tracking-wider active:scale-95"
              >
                Forward, Brave Hero
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
