import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { setOAuthStateCookie } from "@/lib/sync/server/session-cookie.service";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI ||
    new URL("/api/auth/google/callback", request.url).toString();

  if (!clientId) {
    console.error(
      "[GoogleDrive Auth] Falha ao iniciar OAuth: Variável GOOGLE_DRIVE_CLIENT_ID não está configurada no servidor."
    );
    const url = new URL(request.url);
    if (url.searchParams.get("format") === "json") {
      return NextResponse.json(
        { error: "GOOGLE_DRIVE_CLIENT_ID não configurado no servidor." },
        { status: 500 }
      );
    }
    const baseUrl = new URL("/", request.url).origin;
    return NextResponse.redirect(`${baseUrl}/leituras?sync_error=not_configured`);
  }

  try {
    // Gera um state criptograficamente seguro contra CSRF
    const state = crypto.randomBytes(24).toString("hex");
    await setOAuthStateCookie(state);

    const scope = encodeURIComponent("https://www.googleapis.com/auth/drive.appdata openid email");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

    console.log(`[GoogleDrive Auth] Redirecionando usuário para consentimento OAuth no Google (redirectUri: ${redirectUri})`);

    // Se a requisição veio de um client pedindo JSON
    const url = new URL(request.url);
    if (url.searchParams.get("format") === "json") {
      return NextResponse.json({ authUrl });
    }

    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    console.error("[GoogleDrive Auth] Erro inesperado ao iniciar fluxo OAuth:", err?.message || err);
    const baseUrl = new URL("/", request.url).origin;
    return NextResponse.redirect(`${baseUrl}/leituras?sync_error=auth_start_failed`);
  }
}
