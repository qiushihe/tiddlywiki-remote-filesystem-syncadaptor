/*\
title: $:/plugins/qiushihe/remote-filesystem/startup.js
type: application/javascript
module-type: startup
Remote filesystem startup function
\*/

import {
  AWS_S3_CONNECTION_STRING_STORAGE_KEY,
  AWS_S3_CONNECTION_STRING_TIDDLER_TITLE
} from "$:/plugins/qiushihe/remote-filesystem/enum.js";

export const name = "remote-filesystem";
export const platforms = ["browser"];
export const after = ["startup"];
export const synchronous = true;

type WikiChangeEvent = Record<string, Record<"deleted" | "modified", boolean>>;

export const startup = () => {
  const storedConnectionString = localStorage.getItem(
    AWS_S3_CONNECTION_STRING_STORAGE_KEY
  );

  $tw.wiki.addTiddler(
    new $tw.Tiddler({
      title: AWS_S3_CONNECTION_STRING_TIDDLER_TITLE,
      text: storedConnectionString
    })
  );

  $tw.wiki.addEventListener("change", (evt: WikiChangeEvent) => {
    Object.keys(evt).forEach((title) => {
      if (title === AWS_S3_CONNECTION_STRING_TIDDLER_TITLE) {
        localStorage.setItem(
          AWS_S3_CONNECTION_STRING_STORAGE_KEY,
          $tw.wiki.getTiddlerText(title)
        );
      }
    });
  });
};
