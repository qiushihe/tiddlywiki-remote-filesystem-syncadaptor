/*\
title: $:/plugins/qiushihe/remote-filesystem/startup-setup.js
type: application/javascript
module-type: startup
Remote filesystem startup setup function
\*/

import {
  AWS_S3_CONNECTION_STRING_STORAGE_KEY,
  AWS_S3_CONNECTION_STRING_FIELD_ID
} from "$:/plugins/qiushihe/remote-filesystem/enum.js";

export const name = "remote-filesystem-setup";
export const platforms = ["browser"];
export const after = ["startup"];
export const synchronous = true;

const disableAlwaysFetchSkinnyTiddlers = () => {
  // This only work with vendored version of `syncer.js` ... or after this PR is merged upstream:
  // https://github.com/Jermolene/TiddlyWiki5/pull/6372
  $tw.syncer.alwaysFetchAllSkinnyTiddlers = false;
};

const handleConnectionStringInputUpdate = (evt: Event) => {
  localStorage.setItem(
    AWS_S3_CONNECTION_STRING_STORAGE_KEY,
    (evt.target as HTMLInputElement).value
  );
};

const setupConnectionStringPersistence = () => {
  const observer = new MutationObserver((mutationRecords) => {
    const storedConnectionString = localStorage.getItem(
      AWS_S3_CONNECTION_STRING_STORAGE_KEY
    );

    mutationRecords
      .map((mutationRecord) => {
        return mutationRecord.target.parentElement.querySelector(
          `.${AWS_S3_CONNECTION_STRING_FIELD_ID}`
        );
      })
      .filter((input) => !!input)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .forEach((input: HTMLInputElement) => {
        input.value = storedConnectionString;

        input.removeEventListener("keyup", handleConnectionStringInputUpdate);
        input.removeEventListener("change", handleConnectionStringInputUpdate);
        input.addEventListener("keyup", handleConnectionStringInputUpdate);
        input.addEventListener("change", handleConnectionStringInputUpdate);
      });
  });

  observer.observe(document.querySelector(".tc-body"), {
    childList: true,
    subtree: true
  });
};

export const startup = () => {
  disableAlwaysFetchSkinnyTiddlers();
  setupConnectionStringPersistence();
};
