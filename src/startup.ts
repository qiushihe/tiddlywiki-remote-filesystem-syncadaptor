/*\
title: $:/plugins/qiushihe/remote-filesystem/startup.js
type: application/javascript
module-type: startup
Remote filesystem startup function
\*/

export const name = "remote-filesystem";
export const platforms = ["browser"];
export const after = ["startup"];
export const synchronous = true;

export const startup = () => {
  console.log("remote-filesystem start up!");
};
