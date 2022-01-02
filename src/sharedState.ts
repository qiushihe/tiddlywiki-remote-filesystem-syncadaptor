/*\
title: $:/plugins/qiushihe/remote-filesystem/sharedState.js
type: application/javascript
module-type: library
Remote filesystem buffer utility functions
\*/

import { SkinnyTiddlersIndex } from "../types/types";

const TRANSIENT_TIDDLER_TITLE_REGEXPS = [
  new RegExp("^\\$:/Import$"),
  new RegExp("^\\$:/StoryList$")
];

const PRELOAD_TIDDLER_TITLE_REGEXPS = [new RegExp("^\\$:/*")];

export class SharedState {
  static defaultInstance: SharedState | null = null;

  static getDefaultInstance(): SharedState {
    if (SharedState.defaultInstance === null) {
      SharedState.defaultInstance = new SharedState();
    }
    return SharedState.defaultInstance;
  }

  private index: SkinnyTiddlersIndex;

  isTransientTiddlerTitle(title: string): boolean {
    return !!TRANSIENT_TIDDLER_TITLE_REGEXPS.find(title.match.bind(title));
  }

  isPreloadTiddlerTitle(title: string): boolean {
    return !!PRELOAD_TIDDLER_TITLE_REGEXPS.find(title.match.bind(title));
  }

  getIndex(): SkinnyTiddlersIndex {
    return this.index;
  }

  setIndex(index: SkinnyTiddlersIndex): void {
    this.index = index;
  }
}
