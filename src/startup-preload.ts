/*\
title: $:/plugins/qiushihe/remote-filesystem/startup-preload.js
type: application/javascript
module-type: startup
Remote filesystem startup preload function
\*/

import { AwsS3Storage } from "$:/plugins/qiushihe/remote-filesystem/awsS3Storage.js";
import { AWS_S3_CONNECTION_STRING_STORAGE_KEY } from "$:/plugins/qiushihe/remote-filesystem/enum.js";

export const name = "remote-filesystem-preload";
export const platforms = ["browser"];
export const before = ["startup"];
export const synchronous = false;

const restorePalette = async (s3Storage: AwsS3Storage) => {
  const [err, fields] = await s3Storage.loadTiddler("rfs-test", "$:/palette");
  if (!err) {
    $tw.wiki.addTiddler(new $tw.Tiddler(fields));
  }
};

const restoreDefaultTiddlers = async (s3Storage: AwsS3Storage) => {
  let defaultTiddlersPromise = Promise.resolve();

  const [err, fields] = await s3Storage.loadTiddler(
    "rfs-test",
    "$:/DefaultTiddlers"
  );
  if (!err) {
    $tw.wiki.addTiddler(new $tw.Tiddler(fields));

    const missingDefaultTiddlerTitles = $tw.wiki
      .filterTiddlers(fields.text as string)
      .filter((title) => !$tw.wiki.getTiddler(title));

    if (missingDefaultTiddlerTitles.length > 0) {
      let resolveDefaultTiddlersPromise = null;
      defaultTiddlersPromise = new Promise((resolve) => {
        resolveDefaultTiddlersPromise = resolve;
      });

      const missingTiddlersData = await Promise.all(
        missingDefaultTiddlerTitles.map((title) => {
          return s3Storage.loadTiddler("rfs-test", title);
        })
      );

      missingTiddlersData.forEach(([err, tiddlerFields, revision]) => {
        if (!err) {
          $tw.wiki.addTiddler(
            new $tw.Tiddler(
              Object.assign({}, tiddlerFields, {
                revision: revision
              })
            )
          );
        }
      });

      setTimeout(() => resolveDefaultTiddlersPromise(), 1);
    }
  }

  // Wait for the default tiddlers promise(s) to resolve.
  await defaultTiddlersPromise;
};

export const startup = async (callback) => {
  // HACK: Because this startup function is set to run before the built-in startup module (i.e.
  //       $:/core/modules/startup.js) and $tw.perf is initialized in the built-in startup module,
  //       we have to hack manually insert a dummy `$tw.perf.measure` function so the call to
  //       parse default tiddlers string -- $tw.wiki.filterTiddlers(...) -- can run without error.
  // @ts-ignore
  $tw.perf = { measure: (name, fn) => fn };

  // TODO: Implement some sort of workaround to pre-load $:/StoryList.
  //
  //       The `$:/core/modules/startup/story.js` currently does not check if the $:/StoryList
  //       tiddler is already loaded, and will always (re)create it with the tiddlers listed inside
  //       the $:/DefaultTiddlers tiddler.
  //
  //       This means that even though the $:/StoryList is saved, and we can try to fetch it, the
  //       only way to get the `story` module to use it is to do something like this:
  //
  //       $tw.hooks.addHook("th-opening-default-tiddlers-list", (storyList) => {
  //         // Instead of returning the default tiddlers list like:
  //         // return storyList;
  //         return /* tiddler titles fetched from $:/StoryList */;
  //       });
  //
  //       Another option is to update `$:/core/modules/startup/story.js` so it would be able to
  //       receive the `defaultToCurrentStory` option at startup time the same way it currently
  //       receives the `disableHistory` option.

  const s3Storage = new AwsS3Storage(() =>
    Promise.resolve(localStorage.getItem(AWS_S3_CONNECTION_STRING_STORAGE_KEY))
  );

  await restorePalette(s3Storage);
  await restoreDefaultTiddlers(s3Storage);

  setTimeout(() => callback(), 1);
};
