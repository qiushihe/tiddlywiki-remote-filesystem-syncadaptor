declare module "$:/plugins/qiushihe/remote-filesystem/awsS3.js" {
  export const s3Fetch: (
    accessKey: string,
    secretKey: string,
    region: string,
    bucket: string,
    method: string,
    uri: string,
    headers: Record<string, string>,
    query: Record<string, string>,
    payload: string
  ) => Promise<string>;
}
