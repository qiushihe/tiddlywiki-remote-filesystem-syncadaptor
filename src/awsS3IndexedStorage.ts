/*\
title: $:/plugins/qiushihe/remote-filesystem/awsS3IndexedStorage.js
type: application/javascript
module-type: library
Remote filesystem aws s3 request functions
\*/

import { AwsS3Storage } from "$:/plugins/qiushihe/remote-filesystem/awsS3Storage.js";

import {
  decode,
  encode
} from "$:/plugins/qiushihe/remote-filesystem/base62.js";

import {
  SkinnyTiddlersIndex,
  DecodedSkinnyTiddlerIndexKey
} from "../types/types";

const decodeKeyStrings = (
  keyStrings: string[]
): DecodedSkinnyTiddlerIndexKey[] => {
  return keyStrings.map((keyString) => {
    const keyMatch = keyString.match(
      new RegExp("^([^/]+)/([^/]+)/(skinny|fat).json$")
    );

    if (keyMatch) {
      return {
        isValid: true,
        key: keyString,
        namespace: decode(keyMatch[1]),
        title: decode(keyMatch[2]),
        isSkinny: keyMatch[3].toLowerCase() === "skinny"
      };
    } else {
      return {
        isValid: false,
        key: keyString,
        namespace: "",
        title: "",
        isSkinny: false
      };
    }
  });
};

export class AwsS3IndexedStorage extends AwsS3Storage {
  async loadIndex(namespace: string): Promise<[Error, SkinnyTiddlersIndex]> {
    const encodedNamespace = encode(namespace);
    const indexUri = `/${encodedNamespace}/index.json`;

    const data = await this.s3Fetch(
      "GET",
      indexUri,
      {},
      { "response-content-type": "text/plain" },
      null
    );

    try {
      const index = JSON.parse(data) as SkinnyTiddlersIndex;

      const rebuiltAtTime = Date.parse(index.rebuiltAt as unknown as string);
      index.rebuiltAt = isNaN(rebuiltAtTime) ? null : new Date(rebuiltAtTime);

      index.indexedSkinnyTiddlers = index.indexedSkinnyTiddlers.map(
        ({ fields, revision }) => {
          const updatedField = Object.assign({}, fields);

          const createdTime = Date.parse(fields.created as string);
          updatedField.created = isNaN(createdTime)
            ? undefined
            : new Date(createdTime);

          const modifiedTime = Date.parse(fields.modified as string);
          updatedField.modified = isNaN(modifiedTime)
            ? undefined
            : new Date(modifiedTime);

          return {
            fields: updatedField,
            revision: revision
          };
        }
      );

      return [null, index];
    } catch (err) {
      return [err, null];
    }
  }

  async saveIndex(
    namespace: string,
    index: SkinnyTiddlersIndex
  ): Promise<Error> {
    const encodedNamespace = encode(namespace);
    const indexUri = `/${encodedNamespace}/index.json`;

    await this.s3Fetch(
      "PUT",
      indexUri,
      { "content-type": "text/plain" },
      {},
      JSON.stringify(index)
    );

    return null;
  }

  async rebuildIndex(
    namespace: string,
    options: { shouldSkipTiddlerTitle: (title: string) => boolean }
  ): Promise<[Error, SkinnyTiddlersIndex]> {
    const [listAllErr, listAllKeyStrings] = await this.listAll(null);

    const decodedList = decodeKeyStrings(listAllKeyStrings);

    const filteredList = decodedList.filter(
      ({ isValid, isSkinny, namespace: keyNamespace, title }) => {
        return (
          // Only index keys matching the correct pattern.
          isValid &&
          // Only index the stored skinny tiddlers.
          isSkinny &&
          // Only index tiddlers in the specified namespace.
          keyNamespace === namespace &&
          // Don't index any tiddlers skipped by configuration.
          !options.shouldSkipTiddlerTitle(title)
        );
      }
    );

    const data = await Promise.all(
      filteredList.map(({ key }) => {
        return this.s3Fetch(
          "GET",
          `/${key}`,
          {},
          { "response-content-type": "text/plain" },
          null
        );
      })
    );

    const parsedData = data.map((entryString) => {
      try {
        return { tiddler: JSON.parse(entryString), err: null };
      } catch (err) {
        return { tiddler: null, err: err };
      }
    });

    const index: SkinnyTiddlersIndex = {
      rebuiltAt: new Date(),
      allDecodedKeys: decodedList,
      indexedSkinnyTiddlers: parsedData
        .filter(({ err }) => err === null)
        .map(({ tiddler }) => tiddler)
    };

    await this.saveIndex(namespace, index);

    // Generate manifest.txt
    await this.rebuildManifest(namespace, index, {
      shouldSkipTiddlerTitle: options.shouldSkipTiddlerTitle
    });

    return [null, index];
  }

  // This `manifest.txt` isn't used by any code in any way. Instead, it's only meant to make
  // looking at files stored in S3 easier.
  async rebuildManifest(
    namespace: string,
    index: SkinnyTiddlersIndex,
    options: { shouldSkipTiddlerTitle: (title: string) => boolean }
  ): Promise<Error> {
    const filteredList = index.allDecodedKeys.filter(
      ({ isValid, isSkinny, namespace: keyNamespace, title }) => {
        return (
          // Only index keys matching the correct pattern.
          isValid &&
          // Only index the stored skinny tiddlers.
          isSkinny &&
          // Only index tiddlers in the specified namespace.
          keyNamespace === namespace &&
          // Don't index any tiddlers skipped by configuration.
          !options.shouldSkipTiddlerTitle(title)
        );
      }
    );

    const encodedNamespace = encode(namespace);
    const manifestUri = `/${encodedNamespace}/manifest.txt`;

    const entries = []
      .concat(filteredList.map(({ title }) => [encode(title), title]))
      .concat([
        ["index.json", "<< Index of skinny tiddlers >>"],
        ["manifest.txt", "<< Manifest (i.e. this file) >>"]
      ]);

    const maxKeyLength = entries.reduce(
      (acc, [key]: [string]) => (key.length > acc ? key.length : acc),
      0
    );

    const manifest = entries.map(
      ([key, value]: [string, string]) =>
        `${key.padEnd(maxKeyLength, " ")} : ${value}`
    );

    // Use a custom sort function to match the case-insensitive sorting by S3 web console UI.
    manifest.sort((a: string, b: string) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    await this.s3Fetch(
      "PUT",
      manifestUri,
      { "content-type": "text/plain" },
      {},
      []
        .concat([
          "MANIFEST - FOR HUMAN EYES ONLY",
          `TOTAL COUNT: ${manifest.length}`,
          ""
        ])
        .concat(manifest)
        .join("\n")
    );

    return null;
  }
}
