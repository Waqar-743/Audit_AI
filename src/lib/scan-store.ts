import { Redis } from "@upstash/redis";
import type { ScanStatus, ScanResult } from "./scanner/types";

/**
 * Scan state store with Upstash Redis persistence and in-memory fallback.
 */
const scans = new Map<string, ScanStatus>();
const SCAN_TTL_SECONDS = 60 * 60;
const SCAN_KEY_PREFIX = "scan:";

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function scanKey(id: string): string {
  return `${SCAN_KEY_PREFIX}${id}`;
}

async function persistScan(scan: ScanStatus): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(scanKey(scan.id), scan, { ex: SCAN_TTL_SECONDS });
  } catch {
    // Keep API functional even if Redis is unavailable.
  }
}

export async function createScan(id: string, url: string): Promise<ScanStatus> {
  const status: ScanStatus = {
    id,
    status: "pending",
    step: 0,
    stepText: "Initializing...",
    progress: 0,
  };
  scans.set(id, status);
  await persistScan(status);
  return status;
}

export async function updateScan(id: string, update: Partial<ScanStatus>): Promise<void> {
  const existing = scans.get(id);
  if (existing) {
    Object.assign(existing, update);
    scans.set(id, existing);
    await persistScan(existing);
  }
}

export async function getScan(id: string): Promise<ScanStatus | undefined> {
  const cached = scans.get(id);
  if (cached) {
    return cached;
  }

  const redis = getRedisClient();
  if (!redis) {
    return undefined;
  }

  try {
    const stored = await redis.get<ScanStatus>(scanKey(id));
    if (stored && typeof stored === "object") {
      scans.set(id, stored);
      return stored;
    }
  } catch {
    // Keep API functional even if Redis is unavailable.
  }

  return undefined;
}

export async function completeScan(id: string, result: ScanResult): Promise<void> {
  const existing = scans.get(id);
  const next: ScanStatus = existing
    ? {
        ...existing,
        status: "complete",
        step: 5,
        stepText: "Analysis complete!",
        progress: 100,
        result,
        error: undefined,
      }
    : {
        id,
        status: "complete",
        step: 5,
        stepText: "Analysis complete!",
        progress: 100,
        result,
      };

  scans.set(id, next);
  await persistScan(next);
}

export async function failScan(id: string, error: string): Promise<void> {
  const existing = scans.get(id);
  const next: ScanStatus = existing
    ? {
        ...existing,
        status: "error",
        error,
      }
    : {
        id,
        status: "error",
        step: 0,
        stepText: "Scan failed",
        progress: 0,
        error,
      };

  scans.set(id, next);
  await persistScan(next);
}
