import { encode, decode } from "../src/base62";

describe("encode", () => {
  it("should generate expected output", () => {
    expect(encode("Test > This!")).toEqual("Xy6ItDqzmxP17PPt");
  });
});

describe("decode", () => {
  it("should generate expected output", () => {
    expect(decode("Xy6ItDqzmxP17PPt")).toEqual("Test > This!");
  });
});
