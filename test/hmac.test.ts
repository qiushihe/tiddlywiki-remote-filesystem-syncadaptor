import { getArrayBufferHexString } from "../src/buffer";
import { getSigningKey } from "../src/aws";

import { getSha256Hash, getHmacSha256Signature } from "../src/hmac";

import { FIXTURE_EMPTY_STRING_HASH } from "./fixture/hmac.fixture";

import {
  FIXTURE_SECRET_KEY,
  FIXTURE_SHORT_DATE_STRING,
  FIXTURE_REGION,
  FIXTURE_SERVICE,
  EXPECTED_CANONICAL_REQUEST,
  EXPECTED_REQUEST_STRING_DIGEST,
  EXPECTED_STRING_TO_SIGN,
  EXPECTED_SIGNATURE
} from "./fixture/aws.fixture";

describe("getSha256Hash", () => {
  it("should generate expected SHA256 hash", () => {
    return getSha256Hash(EXPECTED_CANONICAL_REQUEST).then(
      (requestStringDigest) => {
        expect(getArrayBufferHexString(requestStringDigest)).toEqual(
          EXPECTED_REQUEST_STRING_DIGEST
        );
      }
    );
  });

  it("should generate expected SHA256 hash for empty string", () => {
    return getSha256Hash("").then((requestStringDigest) => {
      expect(getArrayBufferHexString(requestStringDigest)).toEqual(
        FIXTURE_EMPTY_STRING_HASH
      );
    });
  });
});

describe("getSigningKey", () => {
  it("should generate expected HMAC SHA256 signature", () => {
    return getSigningKey(
      FIXTURE_SECRET_KEY,
      FIXTURE_SHORT_DATE_STRING,
      FIXTURE_REGION,
      FIXTURE_SERVICE
    )
      .then((signingKey) => {
        return getHmacSha256Signature(
          signingKey,
          new TextEncoder().encode(EXPECTED_STRING_TO_SIGN)
        );
      })
      .then((signature) => {
        expect(getArrayBufferHexString(signature)).toEqual(EXPECTED_SIGNATURE);
      });
  });
});
