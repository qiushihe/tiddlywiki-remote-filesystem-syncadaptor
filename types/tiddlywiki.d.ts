export type TiddlerFields = {
  title?: string;
  [key: string]: unknown;
};

export type Tiddler = {
  fields: TiddlerFields;
};

export type HookHandler = (tiddler: Tiddler) => void;

export type Logger = {
  log: (...messages: any[]) => void;
};

export type Wiki = {
  getTiddler: (title: string) => Tiddler;
};
