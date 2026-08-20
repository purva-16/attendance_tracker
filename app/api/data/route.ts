import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const KEY = "attendance-ledger:data";

function hasRedis() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function client() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function GET() {
  if (!hasRedis()) {
    return NextResponse.json({ configured: false, data: null });
  }
  try {
    const data = await client().get(KEY);
    return NextResponse.json({ configured: true, data: data ?? null });
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
    await client().set(KEY, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Redis write failed", e);
    return NextResponse.json(
      { ok: false, error: "Redis write failed" },
      { status: 500 }
    );
  }
}
