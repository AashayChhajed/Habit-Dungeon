import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_USER_ID = "hero-default-id";

export async function GET() {
  try {
    const habits = await db.habit.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(habits);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, difficulty } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const difficultyUpper = (difficulty || "EASY").toUpperCase();
    if (!["EASY", "MEDIUM", "HARD"].includes(difficultyUpper)) {
      return NextResponse.json({ error: "Invalid difficulty level" }, { status: 400 });
    }

    const habit = await db.habit.create({
      data: {
        title,
        difficulty: difficultyUpper,
        userId: DEFAULT_USER_ID,
      },
    });

    return NextResponse.json(habit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, title, difficulty, isCompleted } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (difficulty !== undefined) updateData.difficulty = difficulty.toUpperCase();
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    const habit = await db.habit.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(habit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }

    await db.habit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Habit deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
