import { HookHandler, Wiki, Tiddler } from "./tiddlywiki";

declare global {
  export const $tw: {
    Tiddler: { new (fields: Record<string, any>): Tiddler };
    wiki: Wiki;
    browser?: unknown;
    hooks: {
      addHook: (name: string, handler: HookHandler) => void;
    };
  };
}
