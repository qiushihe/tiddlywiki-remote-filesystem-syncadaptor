/*\
title: $:/plugins/qiushihe/remote-filesystem/buffer.js
type: application/javascript
module-type: library
Remote filesystem buffer utility functions
\*/

export const getArrayBufferHexString = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
