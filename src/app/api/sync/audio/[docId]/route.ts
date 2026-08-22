import { NextRequest, NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await context.params;

    if (!docId) {
      return NextResponse.json({ error: "ID do documento obrigatório." }, { status: 400 });
    }

    const audioBuffer = await GoogleDriveServerService.downloadAudioPackage(docId);

    if (!audioBuffer) {
      return NextResponse.json(
        { error: "Nenhum pacote de áudio encontrado para este documento." },
        { status: 404 }
      );
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao baixar áudio do Google Drive." },
      { status: 500 }
    );
  }
}
