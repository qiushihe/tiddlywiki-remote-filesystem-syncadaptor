/*\
title: $:/plugins/qiushihe/remote-filesystem/uuidv4.js
type: application/javascript
module-type: library
Utility function to generate UUID v4 in pure Javascript
\*/

export const uuidv4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};
