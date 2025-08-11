/**
 * 简单 RSA-OAEP 加密工具（浏览器 WebCrypto 实现，无第三方依赖）
 * - 从 `VITE_AUTH_RSA_PUBLIC_KEY` 读取公钥（PEM，SPKI 格式）
 * - 使用 `RSA-OAEP` + `SHA-256`
 */

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  // 兼容环境变量以单行形式存储，包含 \n 转义的情况
  const fixed = pem.replace(/\\n/g, '\n');
  const clean = fixed
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\r?\n|\r/g, '')
    .trim();
  return base64ToArrayBuffer(clean);
}

export async function encryptPasswordRSA(publicKeyPem: string, plainText: string): Promise<string> {
  if (!publicKeyPem || !plainText) throw new Error('invalid input');

  const keyData = pemToArrayBuffer(publicKeyPem);
  const cryptoKey = await window.crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const enc = new TextEncoder();
  const data = enc.encode(plainText);
  const cipher = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, cryptoKey, data);
  return arrayBufferToBase64(cipher);
}

export function getRsaPublicKeyFromEnv(): string | undefined {
  const k = (import.meta as any).env?.VITE_AUTH_RSA_PUBLIC_KEY as string | undefined;
  if (!k) return undefined;
  return k.trim() || undefined;
}


