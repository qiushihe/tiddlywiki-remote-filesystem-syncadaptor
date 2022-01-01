import { SkinnyTiddlersIndex } from "../types/types";

declare module "$:/plugins/qiushihe/remote-filesystem/sharedState.js" {
  export class SharedState {
    static getDefaultInstance(): SharedState;

    getTransientTiddlerTitles(): string[];
    getPersistentTiddlerTitles(): string[];

    getIndex(): SkinnyTiddlersIndex;
    setIndex(index: SkinnyTiddlersIndex): void;

    getIndexStale(): boolean;
    setIndexStale(isStale: boolean): void;
  }
}
