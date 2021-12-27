import { FIXTURE_EMPTY_STRING_HASH } from "./hmac.fixture";

export const FIXTURE_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

export const FIXTURE_SHORT_DATE_STRING = "20130524";

export const FIXTURE_LONG_DATE_STRING = "20130524T000000Z";

export const FIXTURE_REGION = "us-east-1";

export const FIXTURE_SERVICE = "s3";

export const EXPECTED_CANONICAL_REQUEST = [
  "GET",
  "/test.txt",
  "",
  "host:examplebucket.s3.amazonaws.com",
  "range:bytes=0-9",
  `x-amz-content-sha256:${FIXTURE_EMPTY_STRING_HASH}`,
  "x-amz-date:20130524T000000Z",
  "",
  "host;range;x-amz-content-sha256;x-amz-date",
  FIXTURE_EMPTY_STRING_HASH
].join("\n");

export const EXPECTED_REQUEST_STRING_DIGEST =
  "7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972";

export const EXPECTED_STRING_TO_SIGN = [
  "AWS4-HMAC-SHA256",
  "20130524T000000Z",
  "20130524/us-east-1/s3/aws4_request",
  "7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972"
].join("\n");

export const EXPECTED_SIGNING_KEY =
  "dbb893acc010964918f1fd433add87c70e8b0db6be30c1fbeafefa5ec6ba8378";

export const EXPECTED_SIGNATURE =
  "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41";
