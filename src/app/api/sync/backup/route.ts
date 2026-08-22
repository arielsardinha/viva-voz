import { NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";
import { SyncManifestSchema } from "@/lib/sync/domain/sync.types";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = SyncManifestSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Estrutura do manifesto inválida.", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const fileInfo = await GoogleDriveServerService.uploadManifest(parseResult.data);

    return NextResponse.json({
      success: true,
      file: fileInfo,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro interno ao realizar backup." },
      { status: 500 }
    );
  }
}
