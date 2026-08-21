/**
 * Utilitários para geração de Payload Pix BR Code (EMVCo) e Chaves de Contribuição Voluntária.
 */

export function calculatePixCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatTlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export interface PixPayloadOptions {
  key: string;
  name: string;
  city?: string;
  transactionId?: string;
  amount?: number;
}

export function generatePixPayload({
  key,
  name,
  city = "BRASIL",
  transactionId = "***",
  amount,
}: PixPayloadOptions): string {
  // Limpar acentuação para padrão do protocolo EMVCo
  const cleanName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 25);
  const cleanCity = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 15);

  const merchantAccountInfo =
    formatTlv("00", "br.gov.bcb.pix") + formatTlv("01", key);

  const raw =
    formatTlv("00", "01") + // Payload Format Indicator
    formatTlv("26", merchantAccountInfo) +
    formatTlv("52", "0000") + // Merchant Category Code
    formatTlv("53", "986") + // Transaction Currency (986 = BRL)
    (amount && amount > 0 ? formatTlv("54", amount.toFixed(2)) : "") +
    formatTlv("58", "BR") + // Country Code
    formatTlv("59", cleanName) + // Merchant Name
    formatTlv("60", cleanCity) + // Merchant City
    formatTlv("62", formatTlv("05", transactionId)) + // Additional Data (TxID)
    "6304"; // CRC16 placeholder

  const crc16 = calculatePixCrc16(raw);
  return `${raw}${crc16}`;
}

export const VIVA_VOZ_DONATION_CONFIG = {
  pixKey: "d1b12e3a-a8db-4164-a580-91b6a172e77a",
  recipientName: "VivaVoz",
  city: "BRASIL",
  get payloadPix(): string {
    return generatePixPayload({
      key: this.pixKey,
      name: this.recipientName,
      city: this.city,
    });
  },
};
