export type TiddlerFields = {
  title?: string;
  [key: string]: unknown;
};

export class Tiddler {
  fields: TiddlerFields;
}

export type HookHandler = (tiddler: Tiddler) => void;

export type Logger = {
  log: (...messages: any[]) => void;
};

export type Wiki = {
  addTiddler: (tiddler: Tiddler) => void;
  getTiddler: (title: string) => Tiddler;
  getTiddlerText: (title: string) => string;
  addEventListener: (
    name: string,
    listener: (...args: unknown[]) => void
  ) => void;
};
