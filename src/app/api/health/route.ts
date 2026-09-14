import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRedisReady } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }
  const redis = isRedisReady() ? "ok" : "unavailable";
  const status = database === "ok" ? 200 : 503;
  return NextResponse.json({ status: status === 200 ? "ok" : "degraded", database, redis, time: new Date().toISOString() }, { status });
}
