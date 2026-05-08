import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type WaitlistEntry = {
  name: string;
  phone: string;
  createdAt: string;
};

function isValidName(name: unknown) {
  return typeof name === "string" && name.trim().length >= 2;
}

function normalizePhone(phone: unknown) {
  if (typeof phone !== "string") return null;
  const trimmed = phone.trim();
  if (/^\+\d{10,15}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(digits)) return null;
  return `+${digits}`;
}

async function readJsonArray(filePath: string): Promise<WaitlistEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as WaitlistEntry[];
    return [];
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: unknown; phone?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = normalizePhone(body.phone);

    if (!isValidName(name) || !phone) {
      return NextResponse.json(
        { success: false, error: "Invalid name or phone" },
        { status: 400 },
      );
    }

    const dataDir = path.join(process.cwd(), "data");
    const filePath = path.join(dataDir, "waitlist.json");

    await fs.mkdir(dataDir, { recursive: true });

    const current = await readJsonArray(filePath);
    const entry: WaitlistEntry = { name, phone, createdAt: new Date().toISOString() };
    current.push(entry);

    await fs.writeFile(filePath, JSON.stringify(current, null, 2), "utf8");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}

