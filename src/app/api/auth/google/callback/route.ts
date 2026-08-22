import { NextResponse } from "next/server";
import {
  consumeOAuthStateCookie,
  setDriveSession,
  DriveSessionData,
} from "@/lib/sync/server/session-cookie.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const baseUrl = new URL("/", request.url).origin;

  if (error) {
    console.error(
      `[GoogleDrive Auth] Google retornou erro na autorização: ${error} - ${errorDescription || "Sem descrição adicional"}`
    );
    return NextResponse.redirect(`${baseUrl}/leituras?sync_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    console.error(
      `[GoogleDrive Auth] Callback recebido com parâmetros ausentes: code=${code ? "presente" : "ausente"}, state=${state ? "presente" : "ausente"}`
    );
    return NextResponse.redirect(`${baseUrl}/leituras?sync_error=missing_code_or_state`);
  }

  // Validação do state CSRF
  const savedState = await consumeOAuthStateCookie();
  if (!savedState || savedState !== state) {
    console.error(
      `[GoogleDrive Auth] Incompatibilidade de state CSRF: recebido=${state}, esperado=${savedState || "nenhum"}`
    );
    return NextResponse.redirect(`${baseUrl}/leituras?sync_error=invalid_state`);
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_DRIVE_REDIRECT_URI ||
    new URL("/api/auth/google/callback", request.url).toString();

  if (!clientId || !clientSecret) {
    console.error(
      "[GoogleDrive Auth] Credenciais do servidor ausentes no callback: GOOGLE_DRIVE_CLIENT_ID ou GOOGLE_DRIVE_CLIENT_SECRET não configurados."
    );
    return NextResponse.redirect(`${baseUrl}/leituras?sync_error=server_credentials_missing`);
  }

  try {
    console.log("[GoogleDrive Auth] Trocando authorization code por tokens com https://oauth2.googleapis.com/token...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error(
        `[GoogleDrive Auth] Falha na troca do code por token no Google (HTTP ${tokenResponse.status}): ${errText}`
      );
      return NextResponse.redirect(`${baseUrl}/leituras?sync_error=token_exchange_failed`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      id_token?: string;
    };

    // Extrai o e-mail do usuário se id_token estiver presente
    let userEmail: string | undefined;
    if (tokenData.id_token) {
      try {
        const payloadBase64 = tokenData.id_token.split(".")[1];
        const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
        const payload = JSON.parse(payloadJson) as { email?: string };
        userEmail = payload.email;
      } catch {
        // Ignora falha de parse do id_token
      }
    }

    const sessionData: DriveSessionData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      email: userEmail,
      lastSyncTimestamp: Date.now(),
    };

    await setDriveSession(sessionData);

    console.log(
      `[GoogleDrive Auth] ✅ Conexão estabelecida com sucesso! Conta: ${userEmail || "identificada"}, expira em: ${tokenData.expires_in}s, refreshToken: ${tokenData.refresh_token ? "recebido" : "não enviado pelo Google"}`
    );

    return NextResponse.redirect(`${baseUrl}/leituras?sync=connected`);
  } catch (err: any) {
    console.error("[GoogleDrive Auth] Exceção durante a finalização da conexão:", err?.message || err);
    return NextResponse.redirect(`${baseUrl}/leituras?sync_error=${encodeURIComponent(err?.message || "unknown")}`);
  }
}
