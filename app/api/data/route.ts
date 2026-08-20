import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // ioredis needs a real TCP socket, not Edge

const KEY = "attendance-ledger:data";

function hasRedis() {
  return Boolean(process.env.REDIS_URL);
}

let client: Redis | null = null;
function getClient() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL!);
  }
  return client;
}

export async function GET() {
  if (!hasRedis()) {
    return NextResponse.json({ configured: false, data: null });
  }
  try {
    const raw = await getClient().get(KEY);
    return NextResponse.json({
      configured: true,
      data: raw ? JSON.parse(raw) : null,
    });
  } catch (e) {
    console.error("Redis read failed", e);
    return NextResponse.json({ configured: false, data: null });
  }
}

export async function POST(req: NextRequest) {
  if (!hasRedis()) {
    return NextResponse.json(
      { ok: false, error: "Redis not configured" },
      { status: 501 }
    );
  }
  try {
    const body = await req.json();
    await getClient().set(KEY, JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Redis write failed", e);
    return NextResponse.json(
      { ok: false, error: "Redis write failed" },
      { status: 500 }
    );
  }
}