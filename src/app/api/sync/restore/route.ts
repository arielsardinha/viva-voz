import { NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";

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
    return NextResponse.json(
      { error: err?.message || "Erro ao restaurar backup do Google Drive." },
      { status: 500 }
    );
  }
}
