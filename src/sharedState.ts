/*\
title: $:/plugins/qiushihe/remote-filesystem/sharedState.js
type: application/javascript
module-type: library
Remote filesystem buffer utility functions
\*/

import { AWS_S3_CONNECTION_STRING_STORAGE_KEY } from "$:/plugins/qiushihe/remote-filesystem/enum.js";

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

  readAwsS3ConnectionString(): string {
    return localStorage.getItem(AWS_S3_CONNECTION_STRING_STORAGE_KEY);
  }

  writeAwsS3ConnectionString(connectionString: string): void {
    localStorage.setItem(
      AWS_S3_CONNECTION_STRING_STORAGE_KEY,
      connectionString
    );
  }

  hasAwsS3ConnectionString(): boolean {
    const connectionString = this.readAwsS3ConnectionString();
    return connectionString && connectionString.length > 0;
  }

  getIndex(): SkinnyTiddlersIndex {
    return this.index;
  }

  setIndex(index: SkinnyTiddlersIndex): void {
    this.index = index;
  }
}
