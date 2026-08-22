import { NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";
import { describeDriveError } from "@/lib/sync/domain/drive-error-formatter";

export async function GET() {
  try {
    const manifest = await GoogleDriveServerService.downloadManifest();

    if (!manifest) {
      return NextResponse.json(
        { error: "Nenhum backup encontrado na pasta do aplicativo." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      manifest,
    });
  } catch (err: any) {
    const friendlyError = describeDriveError(err);
    return NextResponse.json(
      { error: friendlyError },
      { status: 500 }
    );
  }
}
