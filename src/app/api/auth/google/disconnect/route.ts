import { NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";
import { clearDriveSession } from "@/lib/sync/server/session-cookie.service";

export async function POST() {
  try {
    await GoogleDriveServerService.revokeToken();
    await clearDriveSession();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    await clearDriveSession();
    return NextResponse.json({ success: true, warning: err?.message });
  }
}
