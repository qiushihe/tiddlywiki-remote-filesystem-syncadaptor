declare module "$:/plugins/qiushihe/remote-filesystem/awsS3IndexedStorage.js" {
  export interface AwsS3IndexedStorage {
    rebuildIndex(namespace: string): Promise<
      [
        Error,
        {
          indexedSkinnyTiddlers: {
            revision: string;
            fields: Record<string, unknown>;
          }[];
        }
      ]
    >;
  }
}
