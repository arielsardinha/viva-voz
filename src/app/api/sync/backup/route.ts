import { NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";
import { SyncManifestSchema } from "@/lib/sync/domain/sync.types";
import { describeDriveError } from "@/lib/sync/domain/drive-error-formatter";
import { getGeminiKeyCookie } from "@/lib/ai/server/gemini-cookie.service";

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

    // Injeta a API Key do cookie HttpOnly no manifesto (BYOK cross-device sync).
    // Se a key foi removida localmente, o campo fica ausente → propaga remoção para a nuvem.
    const apiKey = await getGeminiKeyCookie();
    const manifestWithKey = {
      ...parseResult.data,
      ...(apiKey ? { userApiKey: apiKey } : {}),
    };

    const fileInfo = await GoogleDriveServerService.uploadManifest(manifestWithKey);

    return NextResponse.json({
      success: true,
      file: fileInfo,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    const friendlyError = describeDriveError(err);
    return NextResponse.json(
      { error: friendlyError },
      { status: 500 }
    );
  }
}
