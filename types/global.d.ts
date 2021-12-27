import { HookHandler } from "./tiddlywiki";

declare global {
  export const $tw: {
    browser?: unknown;
    hooks: {
      addHook: (name: string, handler: HookHandler) => void;
    };
  };
}
