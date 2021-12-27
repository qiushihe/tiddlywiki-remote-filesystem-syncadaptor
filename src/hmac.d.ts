declare module "$:/plugins/qiushihe/remote-filesystem/hmac.js" {
  export const getHmacSha256Signature: (
    key: ArrayBuffer,
    message: ArrayBuffer
  ) => Promise<ArrayBuffer>;

  export const getSha256Hash: (message: string) => Promise<ArrayBuffer>;
}
