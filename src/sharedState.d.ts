import { SkinnyTiddlersIndex } from "../types/types";

declare module "$:/plugins/qiushihe/remote-filesystem/sharedState.js" {
  export class SharedState {
    static getDefaultInstance(): SharedState;

    isTransientTiddlerTitle(title: string): boolean;
    isPreloadTiddlerTitle(title: string): boolean;

    getIndex(): SkinnyTiddlersIndex;
    setIndex(index: SkinnyTiddlersIndex): void;
  }
}
