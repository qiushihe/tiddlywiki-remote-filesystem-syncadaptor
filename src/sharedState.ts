/*\
title: $:/plugins/qiushihe/remote-filesystem/sharedState.js
type: application/javascript
module-type: library
Remote filesystem buffer utility functions
\*/

import { SkinnyTiddlersIndex } from "../types/types";

const TRANSIENT_TIDDLER_TITLES = ["$:/Import", "$:/StoryList"];

const PERSISTENT_TIDDLER_TITLES = [
  "$:/favicon.ico",
  "$:/DefaultTiddlers",
  "$:/palette"
];

export class SharedState {
  static defaultInstance: SharedState | null = null;

  static getDefaultInstance(): SharedState {
    if (SharedState.defaultInstance === null) {
      SharedState.defaultInstance = new SharedState();
    }
    return SharedState.defaultInstance;
  }

  private index: SkinnyTiddlersIndex;
  private isIndexStale: boolean;

  getTransientTiddlerTitles(): string[] {
    return TRANSIENT_TIDDLER_TITLES;
  }

  getPersistentTiddlerTitles(): string[] {
    return PERSISTENT_TIDDLER_TITLES;
  }

  getIndex(): SkinnyTiddlersIndex {
    return this.index;
  }

  setIndex(index: SkinnyTiddlersIndex): void {
    this.index = index;
  }

  getIndexStale(): boolean {
    return this.isIndexStale;
  }

  setIndexStale(isStale: boolean): void {
    this.isIndexStale = isStale;
  }
}
