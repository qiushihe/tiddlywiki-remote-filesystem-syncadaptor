/*\
title: $:/plugins/qiushihe/remote-filesystem/startup-setup.js
type: application/javascript
module-type: startup
Remote filesystem startup setup function
\*/

import { SharedState } from "$:/plugins/qiushihe/remote-filesystem/sharedState.js";
import { AWS_S3_CONNECTION_STRING_FIELD_ID } from "$:/plugins/qiushihe/remote-filesystem/enum.js";

export const name = "remote-filesystem-setup";
export const platforms = ["browser"];
export const after = ["startup"];
export const synchronous = true;

const disableAlwaysFetchSkinnyTiddlers = () => {
  // This only work with vendored version of `syncer.js` ... or after this PR is merged upstream:
  // https://github.com/Jermolene/TiddlyWiki5/pull/6372
  $tw.syncer.alwaysFetchAllSkinnyTiddlers = false;
};

const setupConnectionStringPersistence = (state: SharedState) => {
  const handleConnectionStringUpdate = (evt: Event) => {
    state.writeAwsS3ConnectionString((evt.target as HTMLInputElement).value);
  };

  const handleDomMutation = (mutationRecords) => {
    mutationRecords
      .map((mutationRecord) =>
        Array.from(
          mutationRecord.target.parentElement.querySelectorAll(
            `.${AWS_S3_CONNECTION_STRING_FIELD_ID}`
          )
        )
      )
      // Flatten querySelectorAll results.
      .reduce((acc, inputs) => [].concat(acc).concat(inputs), [])
      // Remove nil results.
      .filter((input) => !!input)
      // Remove duplicate results.
      .filter((value, index, arr) => arr.indexOf(value) === index)
      // Setup initial value and event handlers.
      .forEach((input: HTMLInputElement) => {
        input.value = state.readAwsS3ConnectionString();

        input.removeEventListener("keyup", handleConnectionStringUpdate);
        input.removeEventListener("change", handleConnectionStringUpdate);
        input.addEventListener("keyup", handleConnectionStringUpdate);
        input.addEventListener("change", handleConnectionStringUpdate);
      });
  };

  new MutationObserver(handleDomMutation).observe(
    document.querySelector("body"),
    {
      childList: true,
      subtree: true
    }
  );

  handleDomMutation([
    {
      target: {
        parentElement: document.querySelector("body")
      }
    }
  ]);
};

export const startup = () => {
  const sharedState = SharedState.getDefaultInstance();

  disableAlwaysFetchSkinnyTiddlers();
  setupConnectionStringPersistence(sharedState);
};
