import { HookHandler, Wiki, Tiddler, Syncer } from "./tiddlywiki";

declare global {
  export const $tw: {
    Tiddler: { new (fields: Record<string, any>): Tiddler };
    wiki: Wiki;
    syncer: Syncer;
    browser?: unknown;
    hooks: {
      addHook: (name: string, handler: HookHandler) => void;
    };
  };
}
