/*\
title: $:/plugins/qiushihe/remote-filesystem/awsS3.js
type: application/javascript
module-type: library
Remote filesystem aws s3 utility functions
\*/

import { getArrayBufferHexString } from "$:/plugins/qiushihe/remote-filesystem/buffer.js";

import {
  getHmacSha256Signature,
  getSha256Hash
} from "$:/plugins/qiushihe/remote-filesystem/hmac.js";

import {
  getAuthorizationHeaderValue,
  getCanonicalRequest,
  getSigningKey,
  getStringToSign
} from "$:/plugins/qiushihe/remote-filesystem/aws.js";

const getDateLongString = (date: Date) => {
  return [
    `${date.getUTCFullYear()}`,
    `${date.getUTCMonth() + 1}`.padStart(2, "0"),
    `${date.getUTCDate()}`.padStart(2, "0"),
    "T",
    `${date.getUTCHours()}`.padStart(2, "0"),
    `${date.getUTCMinutes()}`.padStart(2, "0"),
    `${date.getUTCSeconds()}`.padStart(2, "0"),
    "Z"
  ].join("");
};

const getDateShortString = (date: Date) => {
  return [
    `${date.getUTCFullYear()}`,
    `${date.getUTCMonth() + 1}`.padStart(2, "0"),
    `${date.getUTCDate()}`.padStart(2, "0")
  ].join("");
};

export const s3Fetch = (
  accessKey: string,
  secretKey: string,
  region: string,
  bucket: string,
  method: string,
  uri: string,
  query: [string, string][],
  payload: string
): Promise<string> => {
  const encoder = new TextEncoder();

  const now = new Date();
  const nowLongString = getDateLongString(now);
  const nowShortString = getDateShortString(now);

  const host = `${bucket}.s3.${region}.amazonaws.com`;

  return getSha256Hash(payload || "").then((payloadHash) => {
    const headers: [string, string][] = [
      ["host", host],
      ["x-amz-date", nowLongString],
      ["x-amz-content-sha256", getArrayBufferHexString(payloadHash)]
    ];

    return getCanonicalRequest(method, uri, query, headers, payload || "")
      .then((canonicalRequest) => getSha256Hash(canonicalRequest))
      .then((requestStringDigest) => {
        const stringToSign = getStringToSign(
          "AWS4-HMAC-SHA256",
          nowLongString,
          `${nowShortString}/${region}/s3/aws4_request`,
          getArrayBufferHexString(requestStringDigest)
        );

        return getSigningKey(secretKey, nowShortString, region, "s3").then(
          (signingKey) =>
            getHmacSha256Signature(signingKey, encoder.encode(stringToSign))
        );
      })
      .then((signature) => {
        const authHeaderValue = getAuthorizationHeaderValue(
          accessKey,
          nowShortString,
          region,
          "s3",
          headers.map(([name]) => name),
          getArrayBufferHexString(signature)
        );

        const fetchQuery = query
          .map(
            ([name, value]) =>
              `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
          )
          .join("&");

        const fetchHeaders = headers.reduce((acc, [name, value]) => {
          acc[name] = value;
          return acc;
        }, {});

        fetchHeaders["Authorization"] = authHeaderValue;

        return fetch(`https://${host}${uri}?${fetchQuery}`, {
          method: method,
          mode: "cors",
          headers: fetchHeaders,
          body: payload ? JSON.stringify(payload) : null
        }).then((res) => res.text());
      });
  });
};
