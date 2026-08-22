import { NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";
import { describeDriveError } from "@/lib/sync/domain/drive-error-formatter";
import {
  setGeminiKeyCookie,
  getGeminiKeyCookie,
} from "@/lib/ai/server/gemini-cookie.service";

export async function GET() {
  try {
    const manifest = await GoogleDriveServerService.downloadManifest();

    if (!manifest) {
      return NextResponse.json(
        { error: "Nenhum backup encontrado na pasta do aplicativo." },
        { status: 404 }
      );
    }

    // Restauração cross-device da API Key: se o manifesto contém userApiKey
    // e o dispositivo atual não possui uma key configurada, restaura via cookie HttpOnly.
    let apiKeyRestored = false;
    if (manifest.userApiKey) {
      const currentKey = await getGeminiKeyCookie();
      if (!currentKey) {
        await setGeminiKeyCookie(manifest.userApiKey);
        apiKeyRestored = true;
      }
    }

    // Remove userApiKey do payload retornado ao client (segurança: nunca expor no JS)
    const { userApiKey: _, ...safeManifest } = manifest;

    return NextResponse.json({
      success: true,
      manifest: safeManifest,
      apiKeyRestored,
    });
  } catch (err: any) {
    const friendlyError = describeDriveError(err);
    return NextResponse.json(
      { error: friendlyError },
      { status: 500 }
    );
  }
}
