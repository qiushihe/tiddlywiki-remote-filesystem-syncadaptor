import { SkinnyTiddlersIndex } from "../types/types";

declare module "$:/plugins/qiushihe/remote-filesystem/awsS3IndexedStorage.js" {
  export class AwsS3IndexedStorage {
    loadIndex(namespace: string): Promise<[Error, SkinnyTiddlersIndex]>;

    rebuildIndex(
      namespace: string,
      options: { shouldSkipTiddlerTitle: (title: string) => boolean }
    ): Promise<[Error, SkinnyTiddlersIndex]>;
  }
}
