/*\
title: $:/plugins/qiushihe/remote-filesystem/awsS3Storage.js
type: application/javascript
module-type: library
Remote filesystem aws s3 request functions
\*/

import { s3Fetch } from "$:/plugins/qiushihe/remote-filesystem/awsS3.js";
import { encode } from "$:/plugins/qiushihe/remote-filesystem/base62.js";

import { ConnectionInfo } from "../types/types";

// Connection string format: aws://[USERNAME]:[KEYS]@[BUCKET].s3.[REGION].amazonaws.com
// ... where `KEYS` is the Base64 encoded string of: [ACCESS KEY]:[SECRET KEY]
const CONNECTION_STRING_REGEXP = new RegExp(
  "^aws://([^:]+):([^@]+)@([^.]+).s3.([^.]+).amazonaws.com$"
);

export const decodeConnectionString = (
  connectionString: string
): ConnectionInfo => {
  const match = (connectionString || "").match(CONNECTION_STRING_REGEXP);
  if (!match) {
    return null;
  } else {
    const [accessKey, secretKey] = atob(match[2]).split(":", 2);

    return {
      username: match[1],
      accessKey: accessKey,
      secretKey: secretKey,
      region: match[4],
      bucket: match[3]
    };
  }
};

export class AwsS3Storage {
  getConnectionString: () => Promise<string>;

  constructor(getConnectionString: () => Promise<string>) {
    this.getConnectionString = getConnectionString;
  }

  async getConnectionInfo(): Promise<ConnectionInfo | null> {
    const connectionString = await this.getConnectionString();
    return decodeConnectionString(connectionString);
  }

  async s3Fetch(
    method: string,
    uri: string,
    headers: Record<string, string>,
    query: Record<string, string>,
    payload: string
  ) {
    const connectionInfo = await this.getConnectionInfo();

    if (connectionInfo) {
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
    } else {
      console.error("!!! No connection info for s3Fetch.");
      return null;
    }
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

    const fatUri = `/${encodedNamespace}/${encodedTitle}/fat.json`;

    const data = await this.s3Fetch(
      "GET",
      fatUri,
      {},
      { "response-content-type": "text/plain" },
      null
    );

    try {
      const { fields, revision } = JSON.parse(data);

      const updatedField = Object.assign({}, fields);

      const createdTime = Date.parse(fields.created as string);
      updatedField.created = isNaN(createdTime)
        ? undefined
        : new Date(createdTime);

      const modifiedTime = Date.parse(fields.modified as string);
      updatedField.modified = isNaN(modifiedTime)
        ? undefined
        : new Date(modifiedTime);

      return [null, updatedField, revision];
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

  async deleteTiddler(namespace: string, title: string): Promise<Error> {
    const encodedNamespace = encode(namespace);
    const encodedTitle = encode(title);

    const fatUri = `/${encodedNamespace}/${encodedTitle}/fat.json`;
    const skinnyUri = `/${encodedNamespace}/${encodedTitle}/skinny.json`;

    await this.s3Fetch("DELETE", fatUri, {}, {}, null);

    await this.s3Fetch("DELETE", skinnyUri, {}, {}, null);

    // TODO: Parse responses for error.

    return null;
  }
}
