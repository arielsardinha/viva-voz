/**
 * Testes unitários para o serviço de cifragem e cookies de sessão.
 */
import {
  encryptPayload,
  decryptPayload,
  DriveSessionData,
} from "./session-cookie.service";

describe("session-cookie.service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, SESSION_SECRET: "test-super-secret-key-32-chars-long!" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("deve cifrar e decifrar com sucesso um payload de sessão", () => {
    const mockSession: DriveSessionData = {
      accessToken: "ya29.mock_access_token_12345",
      refreshToken: "1//mock_refresh_token_67890",
      expiresAt: Date.now() + 3600 * 1000,
      email: "usuario@teste.com",
      lastSyncTimestamp: Date.now(),
    };

    const serialized = JSON.stringify(mockSession);
    const encrypted = encryptPayload(serialized);

    expect(encrypted).toBeDefined();
    expect(encrypted).toContain(".");
    expect(encrypted).not.toContain("ya29.mock_access_token");

    const decrypted = decryptPayload(encrypted);
    expect(decrypted).toBe(serialized);

    const parsed = JSON.parse(decrypted!);
    expect(parsed.accessToken).toBe(mockSession.accessToken);
    expect(parsed.email).toBe(mockSession.email);
  });

  it("deve retornar null ao tentar decifrar um token adulterado ou corrompido", () => {
    const invalidToken = "invalid.format";
    expect(decryptPayload(invalidToken)).toBeNull();

    const corruptedCipher = "iv_fake.tag_fake.data_corrupted";
    expect(decryptPayload(corruptedCipher)).toBeNull();
  });

  it("deve retornar null se a chave secreta mudar", () => {
    const encrypted = encryptPayload("conteudo_secreto");

    // Altera a chave secreta do ambiente
    process.env.SESSION_SECRET = "outra-chave-totalmente-diferente-1234";

    const decrypted = decryptPayload(encrypted);
    expect(decrypted).toBeNull();
  });
});
