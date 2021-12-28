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
  if (
    !["GET", "PUT", "PATCH", "POST", "DELETE"].includes(method.toUpperCase())
  ) {
    throw new Error(
      "Canonical request method must be one of: GET, PUT, PATCH, POST or DELETE."
    );
  }

  if (!uri.match(/^\//)) {
    throw new Error("Canonical request uri must not include URL origin.");
  }

  if (
    !headers.find(([name]) => name.toLowerCase() === "x-amz-content-sha256")
  ) {
    throw new Error(
      "Canonical request must include x-amz-content-sha256 header."
    );
  }

  const xAmzDate = headers.find(
    ([name]) => name.toLowerCase() === "x-amz-date"
  );
  if (xAmzDate) {
    if (!`${xAmzDate[1] || ""}`.match(/^\d\d\d\d\d\d\d\dT\d\d\d\d\d\dZ$/)) {
      throw new Error(
        "Canonical request requires x-amz-dat header to be in the format of `yyyymmddThhmmssZ`."
      );
    }
  }

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
      method.toUpperCase(),
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
  if (!`${date || ""}`.match(/^\d\d\d\d\d\d\d\d$/)) {
    throw new Error(
      "Signing key requires date to be in the format of `yyyymmdd`."
    );
  }

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

export const getAuthorizationHeaderValue = (
  accessKey: string,
  date: string,
  region: string,
  service: string,
  signedHeaders: string[],
  signature: string
): string => {
  if (!`${date || ""}`.match(/^\d\d\d\d\d\d\d\d$/)) {
    throw new Error(
      "Authorization header value requires date to be in the format of `yyyymmdd`."
    );
  }

  signedHeaders.sort();

  return `AWS4-HMAC-SHA256 ${[
    `Credential=${accessKey}/${date}/${region}/${service}/aws4_request`,
    `SignedHeaders=${signedHeaders.join(";")}`,
    `Signature=${signature}`
  ].join(",")}`;
};
