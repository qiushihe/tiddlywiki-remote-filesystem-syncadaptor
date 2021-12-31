/*\
title: $:/plugins/qiushihe/remote-filesystem/base62.js
type: application/javascript
module-type: library
Remote filesystem base62 utility functions
\*/

// Based on: https://github.com/felipecarrillo100/base62str

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    .split("")
    .map((c) => c.charCodeAt(0));

const LOOKUP = new Array(256).fill(null).reduce((acc, _, i) => {
  acc[ALPHABET[i]] = i & 0xff;
  return acc;
}, []);

const STANDARD_BASE = 256;
const TARGET_BASE = 62;

const getBytes = (input: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    bytes.push(input.charCodeAt(i) & 0xff);
  }
  return bytes;
};

const getString = (bytes: number[]): string => {
  return String.fromCharCode.apply(null, bytes);
};

const translate = (indices, dictionary) => {
  const translation = [];
  for (let i = 0; i < indices.length; i++) {
    translation.push(dictionary[indices[i]]);
  }
  return translation;
};

// From: http://codegolf.stackexchange.com/a/21672
const convert = (message: number[], sourceBase: number, targetBase: number) => {
  const out: number[] = [];

  let source = message;

  while (source.length > 0) {
    const quotient: number[] = [];

    let remainder = 0;

    for (const sourceIndex of source) {
      const accumulator = (sourceIndex & 0xff) + remainder * sourceBase;
      const digit = (accumulator - (accumulator % targetBase)) / targetBase;

      remainder = accumulator % targetBase;

      if (quotient.length > 0 || digit > 0) {
        quotient.push(digit);
      }
    }
    out.push(remainder);
    source = quotient;
  }

  for (let i = 0; i < message.length - 1 && message[i] === 0; i++) {
    out.push(0);
  }

  return out.reverse();
};

export const encode = (input: string): string =>
  getString(
    translate(convert(getBytes(input), STANDARD_BASE, TARGET_BASE), ALPHABET)
  );

export const decode = (input: string): string =>
  getString(
    convert(translate(getBytes(input), LOOKUP), TARGET_BASE, STANDARD_BASE)
  );
