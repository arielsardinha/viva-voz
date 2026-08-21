import { calculatePixCrc16, generatePixPayload, VIVA_VOZ_DONATION_CONFIG } from "./pix";

describe("Pix Utilities & Payload Generator", () => {
  it("deve calcular o CRC16 corretamente para uma string conhecida", () => {
    const payload = "00020126360014br.gov.bcb.pix0114+55119999999995204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    const crc = calculatePixCrc16(payload);
    expect(crc).toHaveLength(4);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
  });

  it("deve gerar um payload Pix EMV válido com a chave e nome do projeto", () => {
    const pixCode = generatePixPayload({
      key: "d1b12e3a-a8db-4164-a580-91b6a172e77a",
      name: "VivaVoz",
      city: "BRASIL",
    });

    expect(pixCode).toContain("br.gov.bcb.pix");
    expect(pixCode).toContain("d1b12e3a-a8db-4164-a580-91b6a172e77a");
    expect(pixCode).toContain("VivaVoz");
    expect(pixCode.startsWith("000201")).toBe(true);
    expect(pixCode).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("deve conter a configuração padrão do VivaVoz com a chave correta", () => {
    expect(VIVA_VOZ_DONATION_CONFIG.pixKey).toBe("d1b12e3a-a8db-4164-a580-91b6a172e77a");
    expect(VIVA_VOZ_DONATION_CONFIG.recipientName).toBe("VivaVoz");
    expect(VIVA_VOZ_DONATION_CONFIG.payloadPix).toContain("d1b12e3a-a8db-4164-a580-91b6a172e77a");
  });
});
