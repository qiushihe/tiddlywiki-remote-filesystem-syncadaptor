/*\
title: $:/plugins/qiushihe/remote-filesystem/awsS3Storage.js
type: application/javascript
module-type: library
Remote filesystem aws s3 request functions
\*/

import { s3Fetch } from "$:/plugins/qiushihe/remote-filesystem/awsS3.js";
import {
  encode,
  decode
} from "$:/plugins/qiushihe/remote-filesystem/base62.js";

type ConnectionInfo = {
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
};

// Connection string format: aws://[KEY]:[SECRET]@[BUCKET].s3.[REGION].amazonaws.com
const CONNECTION_STRING_REGEXP = new RegExp(
  "^aws://([^:]+):([^@]+)@([^.]+).s3.([^.]+).amazonaws.com$"
);

const decodeKeyStrings = (keyStrings: string[]) => {
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

export class AwsS3Storage {
  getConnectionString: () => Promise<string>;

  constructor(getConnectionString: () => Promise<string>) {
    this.getConnectionString = getConnectionString;
  }

  async getConnectionInfo(): Promise<ConnectionInfo | null> {
    const connectionString = await this.getConnectionString();

    const match = connectionString.match(CONNECTION_STRING_REGEXP);
    if (!match) {
      return null;
    } else {
      return {
        accessKey: match[1],
        secretKey: match[2],
        region: match[4],
        bucket: match[3]
      };
    }
  }

  async s3Fetch(
    method: string,
    uri: string,
    headers: Record<string, string>,
    query: Record<string, string>,
    payload: string
  ) {
    const connectionInfo = await this.getConnectionInfo();

    return s3Fetch(
      connectionInfo.accessKey,
      connectionInfo.secretKey,
      connectionInfo.region,
      connectionInfo.bucket,
      method,
      uri,
      headers,
      query,
      payload
    );
  }

  async listAll(continuationToken: string): Promise<[Error, string[]]> {
    const query = {
      // "max-keys": "3", // The default is 1000.
      "list-type": "2"
    };

    if (continuationToken) {
      query["continuation-token"] = continuationToken;
    }

    const data = await this.s3Fetch("GET", "/", {}, query, null);

    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "application/xml");

    // noinspection CssInvalidHtmlTagReference
    const keyNodes = doc.querySelectorAll("Contents > Key");

    const keyStrings = Array.from(keyNodes).map(
      (keyNode) => keyNode.textContent
    );

    // noinspection CssInvalidHtmlTagReference
    const isTruncated = doc.querySelector("IsTruncated").textContent === "true";

    if (isTruncated) {
      // noinspection CssInvalidHtmlTagReference
      const nextContinuationToken = doc.querySelector(
        "NextContinuationToken"
      ).textContent;

      const [moreErr, moreKeyStrings] = await this.listAll(
        nextContinuationToken
      );

      return [null, [].concat(keyStrings).concat(moreKeyStrings)];
    } else {
      return [null, keyStrings];
    }
  }

  async loadTiddler(
    namespace: string,
    title: string
  ): Promise<[Error, Record<string, unknown>, string]> {
    const encodedNamespace = encode(namespace);
    const encodedTitle = encode(title);

    const data = await this.s3Fetch(
      "GET",
      `/${encodedNamespace}/${encodedTitle}/fat.json`,
      {},
      { "response-content-type": "text/plain" },
      null
    );

    try {
      const { fields, revision } = JSON.parse(data);
      return [null, fields, revision];
    } catch (err) {
      return [err, null, null];
    }
  }

  async saveTiddler(
    namespace: string,
    fields: Record<string, unknown>,
    revision: string
  ): Promise<[Error]> {
    const encodedNamespace = encode(namespace);
    const encodedTitle = encode(fields["title"] as string);

    const fatUri = `/${encodedNamespace}/${encodedTitle}/fat.json`;
    const skinnyUri = `/${encodedNamespace}/${encodedTitle}/skinny.json`;

    const skinnyFields = Object.keys(fields).reduce((acc, key) => {
      if (key !== "text") {
        acc[key] = fields[key];
      }
      return acc;
    }, {});

    await this.s3Fetch(
      "PUT",
      fatUri,
      { "content-type": "text/plain" },
      {},
      JSON.stringify({ revision: revision, fields: fields })
    );

    await this.s3Fetch(
      "PUT",
      skinnyUri,
      { "content-type": "text/plain" },
      {},
      JSON.stringify({
        revision: revision,
        fields: skinnyFields
      })
    );

    return [null];
  }

  async rebuildSkinnyTiddlersIndex(namespace: string): Promise<
    [
      Error,
      {
        indexedSkinnyTiddlers: {
          revision: string;
          fields: Record<string, unknown>;
        }[];
      }
    ]
  > {
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
          // Don't index any system tiddlers.
          // Use startup-preload to load those system tiddlers directly instead.
          !title.match(new RegExp("^\\$:"))
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
        return { fields: JSON.parse(entryString), err: null };
      } catch (err) {
        return { fields: null, err: err };
      }
    });

    const index = {
      indexedSkinnyTiddlers: parsedData
        .filter(({ err }) => err === null)
        .map(({ fields }) => fields)
    };

    const encodedNamespace = encode(namespace);
    const indexUri = `/${encodedNamespace}/index.json`;

    await this.s3Fetch(
      "PUT",
      indexUri,
      { "content-type": "text/plain" },
      {},
      JSON.stringify(index)
    );

    return [null, index];
  }
}
