declare module "$:/plugins/qiushihe/remote-filesystem/aws.js" {
  export const getCanonicalRequest: (
    method: string,
    uri: string,
    query: [string, string][],
    headers: [string, string][],
    payload: string
  ) => Promise<string>;

  export const getStringToSign: (
    algorithm: string,
    requestDate: string,
    credentialScope: string,
    hashedCanonicalRequest: string
  ) => string;

  export const getSigningKey: (
    secretKey: string,
    date: string,
    region: string,
    service: string
  ) => Promise<ArrayBuffer>;
}
