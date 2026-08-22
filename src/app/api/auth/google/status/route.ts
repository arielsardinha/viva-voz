import { NextResponse } from "next/server";
import { getDriveSession } from "@/lib/sync/server/session-cookie.service";
import type { DriveAuthStatus } from "@/lib/sync/domain/sync.types";

export async function GET() {
  try {
    const session = await getDriveSession();
    if (!session || !session.accessToken) {
      return NextResponse.json<DriveAuthStatus>({
        isConnected: false,
      });
    }

    return NextResponse.json<DriveAuthStatus>({
      isConnected: true,
      email: session.email,
      expiresAt: session.expiresAt,
      lastSyncTimestamp: session.lastSyncTimestamp,
    });
  } catch {
    return NextResponse.json<DriveAuthStatus>({
      isConnected: false,
    });
  }
}
