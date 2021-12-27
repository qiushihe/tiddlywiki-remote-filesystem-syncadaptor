import { getArrayBufferHexString } from "../src/buffer";
import { getSha256Hash } from "../src/hmac";

import {
  getCanonicalRequest,
  getStringToSign,
  getSigningKey
} from "../src/aws";

import {
  FIXTURE_SECRET_KEY,
  FIXTURE_SHORT_DATE_STRING,
  FIXTURE_LONG_DATE_STRING,
  FIXTURE_REGION,
  FIXTURE_SERVICE,
  EXPECTED_CANONICAL_REQUEST,
  EXPECTED_STRING_TO_SIGN,
  EXPECTED_SIGNING_KEY
} from "./fixture/aws.fixture";

describe("getCanonicalRequest", () => {
  it("should generate expected canonical request string", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [
        ["host", "examplebucket.s3.amazonaws.com"],
        ["x-amz-date", FIXTURE_LONG_DATE_STRING],
        [
          "x-amz-content-sha256",
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        ],
        ["range", "bytes=0-9"]
      ],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString).toEqual(EXPECTED_CANONICAL_REQUEST);
    });
  });
});

describe("getStringToSign", () => {
  it("should generate expected string to sign", () => {
    return getSha256Hash(EXPECTED_CANONICAL_REQUEST).then(
      (requestStringDigest) => {
        const stringToSign = getStringToSign(
          "AWS4-HMAC-SHA256",
          FIXTURE_LONG_DATE_STRING,
          `${FIXTURE_SHORT_DATE_STRING}/${FIXTURE_REGION}/${FIXTURE_SERVICE}/aws4_request`,
          getArrayBufferHexString(requestStringDigest)
        );

        expect(stringToSign).toEqual(EXPECTED_STRING_TO_SIGN);
      }
    );
  });
});

describe("getSigningKey", () => {
  it("should generate expected signing key", () => {
    return getSigningKey(
      FIXTURE_SECRET_KEY,
      FIXTURE_SHORT_DATE_STRING,
      FIXTURE_REGION,
      FIXTURE_SERVICE
    ).then((signingKey) => {
      expect(getArrayBufferHexString(signingKey)).toEqual(EXPECTED_SIGNING_KEY);
    });
  });
});
