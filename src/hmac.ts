/*\
title: $:/plugins/qiushihe/remote-filesystem/hmac.js
type: application/javascript
module-type: library
Remote filesystem hmac crypto utility functions
\*/

export const getHmacSha256Signature = async (
  key: ArrayBuffer,
  message: ArrayBuffer
): Promise<ArrayBuffer> => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign", "verify"]
  );

  return crypto.subtle.sign("HMAC", cryptoKey, message);
};

export const getSha256Hash = (message: string): Promise<ArrayBuffer> =>
  crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
