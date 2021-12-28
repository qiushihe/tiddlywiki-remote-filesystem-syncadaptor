import { getArrayBufferHexString } from "../src/buffer";
import { getSha256Hash } from "../src/hmac";

import {
  getCanonicalRequest,
  getStringToSign,
  getSigningKey,
  getAuthorizationHeaderValue
} from "../src/aws";

import { FIXTURE_EMPTY_STRING_HASH } from "./fixture/hmac.fixture";

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
        ["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH],
        ["range", "bytes=0-9"]
      ],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString).toEqual(EXPECTED_CANONICAL_REQUEST);
    });
  });

  it("should validate method value", () => {
    return getCanonicalRequest(
      "LALA",
      "/test.txt",
      [],
      [["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    )
      .then(() => {
        throw new Error("should have invalidated invalid method value");
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toEqual(
          "Canonical request method must be one of: GET, PUT, PATCH, POST or DELETE."
        );
      });
  });

  it("should validate uri value", () => {
    return getCanonicalRequest(
      "GET",
      "http://lala.com/test.txt",
      [],
      [["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    )
      .then(() => {
        throw new Error("should have invalidated invalid uri value");
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toEqual(
          "Canonical request uri must not include URL origin."
        );
      });
  });

  it("should sort query parameters by name in ascending order", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [
        ["micro", "soft"],
        ["apple", "computer"],
        ["you", "book"],
        ["face", "tube"]
      ],
      [["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[2]).toEqual(
        "apple=computer&face=tube&micro=soft&you=book"
      );
    });
  });

  it("should include empty query parameter", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [
        ["micro", "soft"],
        ["apple", "computer"],
        ["face", ""]
      ],
      [["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[2]).toEqual(
        "apple=computer&face=&micro=soft"
      );
    });
  });

  it("should include empty line when there is no query parameter", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[2]).toEqual("");
    });
  });

  it("should sort header parameters by name in ascending order", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [
        ["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH],
        ["business", "number=0-9"],
        ["agent", "smith"]
      ],
      ""
    ).then((canonicalRequestString) => {
      expect(
        canonicalRequestString
          .split("\n")
          .slice(3, 6)
          .map((h) => h.split(":")[0])
      ).toEqual(["agent", "business", "x-amz-content-sha256"]);
    });
  });

  it("should convert header parameter name to lower case", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [["X-AMZ-CONTENT-SHA256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[3].split(":")[0]).toEqual(
        "x-amz-content-sha256"
      );
    });
  });

  it("should not convert header parameter value to lower case", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [
        ["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH],
        ["agent", "sMiTh"]
      ],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[3].split(":")[1]).toEqual(
        "sMiTh"
      );
    });
  });

  it("should require x-amz-content-sha256 header", () => {
    return getCanonicalRequest("GET", "/test.txt", [], [], "")
      .then(() => {
        throw new Error("should have required x-amz-content-sha256 header");
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toEqual(
          "Canonical request must include x-amz-content-sha256 header."
        );
      });
  });

  it("should validate x-amz-date header value format", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [
        ["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH],
        ["x-amz-date", "23710604"]
      ],
      ""
    )
      .then(() => {
        throw new Error(
          "should have invalidated invalid x-amz-date header value format"
        );
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toEqual(
          "Canonical request requires x-amz-dat header to be in the format of `yyyymmddThhmmssZ`."
        );
      });
  });

  it("should include an empty line after header values", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[4]).toEqual("");
    });
  });

  it("should include names of headers sorted in ascending order", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [
        ["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH],
        ["business", "number=0-9"],
        ["agent", "smith"]
      ],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[7]).toEqual(
        "agent;business;x-amz-content-sha256"
      );
    });
  });

  it("should include hash of empty string when there is no payload", () => {
    return getCanonicalRequest(
      "GET",
      "/test.txt",
      [],
      [["x-amz-content-sha256", FIXTURE_EMPTY_STRING_HASH]],
      ""
    ).then((canonicalRequestString) => {
      expect(canonicalRequestString.split("\n")[6]).toEqual(
        FIXTURE_EMPTY_STRING_HASH
      );
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

  it("should validate date format", () => {
    return getSigningKey(
      FIXTURE_SECRET_KEY,
      FIXTURE_LONG_DATE_STRING,
      FIXTURE_REGION,
      FIXTURE_SERVICE
    )
      .then(() => {
        throw new Error("should have invalidated invalid date format");
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toEqual(
          "Signing key requires date to be in the format of `yyyymmdd`."
        );
      });
  });
});

describe("getAuthorizationHeaderValue", () => {
  it("should generate expected authorization header value", () => {
    const headerValue = getAuthorizationHeaderValue(
      "aCcEsSkEy",
      "23710604",
      "us-lala-0",
      "lol-serv",
      ["banana", "apple", "cumin"],
      "sig"
    );

    expect(headerValue).toEqual(
      "AWS4-HMAC-SHA256 Credential=aCcEsSkEy/23710604/us-lala-0/lol-serv/aws4_request,SignedHeaders=apple;banana;cumin,Signature=sig"
    );
  });

  it("should validate date format", () => {
    let failed = false;

    try {
      getAuthorizationHeaderValue(
        "aCcEsSkEy",
        FIXTURE_LONG_DATE_STRING,
        "us-lala-0",
        "lol-serv",
        ["banana", "apple", "cumin"],
        "sig"
      );

      failed = true;
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toEqual(
        "Authorization header value requires date to be in the format of `yyyymmdd`."
      );
    }

    if (failed) {
      throw new Error("should have invalidated invalid date format");
    }
  });
});
