import { SkinnyTiddlersIndex } from "../types/types";

declare module "$:/plugins/qiushihe/remote-filesystem/sharedState.js" {
  export class SharedState {
    static getDefaultInstance(): SharedState;

    isTransientTiddlerTitle(title: string): boolean;
    isPreloadTiddlerTitle(title: string): boolean;

    readAwsS3ConnectionString(): string;
    writeAwsS3ConnectionString(connectionString: string): void;
    hasAwsS3ConnectionString(): boolean;

    getIndex(): SkinnyTiddlersIndex;
    setIndex(index: SkinnyTiddlersIndex): void;
  }
}
