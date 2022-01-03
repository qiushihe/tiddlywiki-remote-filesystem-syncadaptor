/*\
title: $:/plugins/qiushihe/remote-filesystem/startup-preload.js
type: application/javascript
module-type: startup
Remote filesystem startup preload function
\*/

import { SharedState } from "$:/plugins/qiushihe/remote-filesystem/sharedState.js";
import { AwsS3IndexedStorage } from "$:/plugins/qiushihe/remote-filesystem/awsS3IndexedStorage.js";

import { SkinnyTiddlersIndex } from "../types/types";

export const name = "remote-filesystem-preload";
export const platforms = ["browser"];
export const before = ["startup"];
export const synchronous = false;

const REBUILD_INDEX_MIN = 10;

const ensureIndex = async (
  s3Storage: AwsS3IndexedStorage,
  options: { shouldSkipTiddlerTitle: (title: string) => boolean }
): Promise<SkinnyTiddlersIndex> => {
  const [indexErr, index] = await s3Storage.loadIndex("rfs-test");
  if (!indexErr) {
    const now = new Date();
    const nowTime = new Date().getTime();
    const rebuiltAtTime = index.rebuiltAt
      ? index.rebuiltAt.getTime()
      : now.getTime();
    const diffInMinutes = (nowTime - rebuiltAtTime) / 1000 / 60;

    if (diffInMinutes >= REBUILD_INDEX_MIN) {
      const [newIndexErr, newIndex] = await s3Storage.rebuildIndex("rfs-test", {
        shouldSkipTiddlerTitle: options.shouldSkipTiddlerTitle
      });
      if (!newIndexErr) {
        return newIndex;
      } else {
        console.error("!!! TODO: Handler this error", newIndexErr);
        return null;
      }
    } else {
      return index;
    }
  } else {
    console.error("!!! TODO: Handler this error", indexErr);
    return null;
  }
};

const loadTiddlers = async (
  s3Storage: AwsS3IndexedStorage,
  titles: string[]
) => {
  const results = await Promise.all(
    titles.map((title) => s3Storage.loadTiddler("rfs-test", title))
  );

  results.forEach(([err, fields, revision]) => {
    if (!err) {
      $tw.wiki.addTiddler(
        new $tw.Tiddler(
          Object.assign({}, fields, {
            revision: revision
          })
        )
      );
    }
  });
};

const loadDefaultTiddlers = async (s3Storage: AwsS3IndexedStorage) => {
  // HACK: Because this startup function is set to run before the built-in startup module (i.e.
  //       $:/core/modules/startup.js) and $tw.perf is initialized in the built-in startup module,
  //       we have to hack manually insert a dummy `$tw.perf.measure` function so the call to
  //       parse default tiddlers string -- $tw.wiki.filterTiddlers(...) -- can run without error.
  // @ts-ignore
  $tw.perf = { measure: (name, fn) => fn };

  const defaultTiddlersText = $tw.wiki.getTiddlerText("$:/DefaultTiddlers");

  const missingDefaultTiddlerTitles = $tw.wiki
    .filterTiddlers(defaultTiddlersText)
    .filter((title) => !$tw.wiki.getTiddler(title));

  await loadTiddlers(s3Storage, missingDefaultTiddlerTitles);
};

export const startup = async (callback) => {
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

  const sharedState = SharedState.getDefaultInstance();

  const s3Storage = new AwsS3IndexedStorage(() =>
    Promise.resolve(sharedState.readAwsS3ConnectionString())
  );

  if (sharedState.hasAwsS3ConnectionString()) {
    const index = await ensureIndex(s3Storage, {
      shouldSkipTiddlerTitle: (title) =>
        sharedState.isTransientTiddlerTitle(title)
    });
    if (index) {
      sharedState.setIndex(index);
    } else {
      console.error("!!! Handle missing index!");
    }

    const preloadTiddlerTitles = index.allDecodedKeys
      .filter(
        ({ title, isSkinny }) =>
          !isSkinny &&
          sharedState.isPreloadTiddlerTitle(title) &&
          !sharedState.isTransientTiddlerTitle(title)
      )
      .map(({ title }) => title);

    await loadTiddlers(s3Storage, preloadTiddlerTitles);

    await loadDefaultTiddlers(s3Storage);
  } else {
    console.error("!!! Not preloading on startup: Missing connection string.");
  }

  callback();
};
