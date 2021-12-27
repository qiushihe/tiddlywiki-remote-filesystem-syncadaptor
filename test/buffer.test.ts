import { getArrayBufferHexString } from "../src/buffer";

import { getSha256Hash } from "../src/hmac";

import { FIXTURE_EMPTY_STRING_HASH } from "./fixture/hmac.fixture";

import {
  EXPECTED_CANONICAL_REQUEST,
  EXPECTED_REQUEST_STRING_DIGEST
} from "./fixture/aws.fixture";

describe("getArrayBufferHexString", () => {
  it("should generate expected hex for empty string", () => {
    return getSha256Hash("").then((requestStringDigest) => {
      expect(getArrayBufferHexString(requestStringDigest)).toEqual(
        FIXTURE_EMPTY_STRING_HASH
      );
    });
  });

  it("should generate expected hex for given string", () => {
    return getSha256Hash(EXPECTED_CANONICAL_REQUEST).then(
      (requestStringDigest) => {
        expect(getArrayBufferHexString(requestStringDigest)).toEqual(
          EXPECTED_REQUEST_STRING_DIGEST
        );
      }
    );
  });
});
