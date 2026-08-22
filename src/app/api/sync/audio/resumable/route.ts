import { NextResponse } from "next/server";
import { GoogleDriveServerService } from "@/lib/sync/server/google-drive.service";
import { describeDriveError } from "@/lib/sync/domain/drive-error-formatter";
import { z } from "zod";

const ResumableInitSchema = z.object({
  documentId: z.string().min(1),
  totalSizeBytes: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = ResumableInitSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Parâmetros de upload inválidos.", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { documentId, totalSizeBytes } = parseResult.data;
    const { uploadUrl } = await GoogleDriveServerService.initiateAudioResumableUpload(
      documentId,
      totalSizeBytes
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
    });
  } catch (err: any) {
    const friendlyError = describeDriveError(err);
    return NextResponse.json(
      { error: friendlyError },
      { status: 500 }
    );
  }
}
