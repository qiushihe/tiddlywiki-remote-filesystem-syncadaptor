/*\
title: $:/plugins/qiushihe/remote-filesystem/aws.js
type: application/javascript
module-type: library
Remote filesystem aws utility functions
\*/

import { getArrayBufferHexString } from "$:/plugins/qiushihe/remote-filesystem/buffer";

import {
  getHmacSha256Signature,
  getSha256Hash
} from "$:/plugins/qiushihe/remote-filesystem/hmac";

export const getCanonicalRequest = (
  method: string,
  uri: string,
  query: [string, string][],
  headers: [string, string][],
  payload: string
): Promise<string> => {
  const queryParameters = query.map(([name, value]) => {
    return [encodeURIComponent(name), encodeURIComponent(value)].join("=");
  });

  queryParameters.sort();

  const queryString = queryParameters.join("&");

  const headerParameters = headers.map(([name, value]) => {
    return [name.trim().toLowerCase(), value.trim()].join(":") + "\n";
  });

  headerParameters.sort();

  const headerString = headerParameters.join("");

  const headerNames = headers.map(([name]) => {
    return name.trim().toLowerCase();
  });

  headerNames.sort();

  const headerNamesString = headerNames.join(";");

  return getSha256Hash(payload).then((hashedPayload) => {
    return [
      method,
      uri,
      queryString,
      headerString,
      headerNamesString,
      getArrayBufferHexString(hashedPayload)
    ].join("\n");
  });
};

export const getStringToSign = (
  algorithm: string,
  requestDate: string,
  credentialScope: string,
  hashedCanonicalRequest: string
): string => {
  return [algorithm, requestDate, credentialScope, hashedCanonicalRequest].join(
    "\n"
  );
};

export const getSigningKey = (
  secretKey: string,
  date: string,
  region: string,
  service: string
): Promise<ArrayBuffer> => {
  const enc = new TextEncoder();

  return getHmacSha256Signature(
    enc.encode("AWS4" + secretKey),
    enc.encode(date)
  )
    .then((dateKey) => {
      return getHmacSha256Signature(dateKey, enc.encode(region));
    })
    .then((dateRegionKey) => {
      return getHmacSha256Signature(dateRegionKey, enc.encode(service));
    })
    .then((dateRegionServiceKey) => {
      return getHmacSha256Signature(
        dateRegionServiceKey,
        enc.encode("aws4_request")
      );
    });
};
