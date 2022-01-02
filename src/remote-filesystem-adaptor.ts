/*\
title: $:/plugins/qiushihe/remote-filesystem/remote-filesystem-adaptor.js
type: application/javascript
module-type: syncadaptor
A sync adaptor module for synchronising with a remote filesystem
\*/

import { AwsS3IndexedStorage } from "$:/plugins/qiushihe/remote-filesystem/awsS3IndexedStorage.js";
import { SharedState } from "$:/plugins/qiushihe/remote-filesystem/sharedState.js";
import { AWS_S3_CONNECTION_STRING_STORAGE_KEY } from "$:/plugins/qiushihe/remote-filesystem/enum.js";
import { encode } from "$:/plugins/qiushihe/remote-filesystem/base62.js";

import { Wiki, Logger, TiddlerFields } from "../types/tiddlywiki";
import { AdaptorInfo, SkinnyTiddlersIndex, TiddlerInfo } from "../types/types";

const TIDDLER_PENDING_REVISIONS = {};
const pendingRevisionLocks = {};
const pendingRevisionLockResolves = {};

const getNewRevision = (date: Date) => {
  return [
    `${date.getUTCFullYear()}`.padStart(4, "0"),
    `${date.getUTCMonth() + 1}`.padStart(2, "0"),
    `${date.getUTCDate()}`.padStart(2, "0"),
    `${date.getUTCHours()}`.padStart(2, "0"),
    `${date.getUTCMinutes()}`.padStart(2, "0"),
    `${date.getUTCSeconds()}`.padStart(2, "0"),
    `${date.getUTCMilliseconds()}`.padStart(4, "0")
  ].join("");
};

const getPendingRevisionLock = (title): Promise<void> => {
  if (!pendingRevisionLocks[title]) {
    pendingRevisionLocks[title] = new Promise((resolve) => {
      pendingRevisionLockResolves[title] = resolve;
    });
  }
  return pendingRevisionLocks[title];
};

const resolvePendingRevisionLock = (title): void => {
  if (pendingRevisionLocks[title]) {
    const resolve = pendingRevisionLockResolves[title];

    if (resolve) {
      setTimeout(() => resolve(), 1);
    }
  }
};

const clearPendingRevisionLock = (title): void => {
  if (pendingRevisionLocks[title]) {
    pendingRevisionLocks[title] = null;
  }

  if (pendingRevisionLockResolves[title]) {
    pendingRevisionLockResolves[title] = null;
  }
};

const deleteSkinnyTiddlerIndex = (
  index: SkinnyTiddlersIndex,
  title: string
): SkinnyTiddlersIndex => {
  index.allDecodedKeys = index.allDecodedKeys.filter(
    ({ title: decodedKeyTitle }) => decodedKeyTitle !== title
  );

  index.indexedSkinnyTiddlers = index.indexedSkinnyTiddlers.filter(
    ({ fields: indexedSkinnyTiddlerFields }) =>
      indexedSkinnyTiddlerFields.title !== title
  );

  return index;
};

const updateSkinnyTiddlerIndex = (
  index: SkinnyTiddlersIndex,
  fields: TiddlerFields,
  revision: string
): SkinnyTiddlersIndex => {
  const _index = deleteSkinnyTiddlerIndex(index, fields.title);

  const encodedNamespace = encode("rfs-test");
  const encodedTitle = encode(fields.title);

  _index.allDecodedKeys.push({
    isValid: true,
    key: `${encodedNamespace}/${encodedTitle}/skinny.json`,
    namespace: "rfs-test",
    title: fields.title,
    isSkinny: true
  });

  _index.allDecodedKeys.push({
    isValid: true,
    key: `${encodedNamespace}/${encodedTitle}/fat.json`,
    namespace: "rfs-test",
    title: fields.title,
    isSkinny: false
  });

  _index.indexedSkinnyTiddlers.push({ fields: fields, revision: revision });

  return _index;
};

class RemoteFileSystemAdaptor {
  wiki: Wiki;
  logger: Logger;
  name: string;
  supportsLazyLoading: boolean;
  s3Storage: AwsS3IndexedStorage;
  state: SharedState;

  constructor(options) {
    this.wiki = options.wiki;

    // This `name` is also prefixed to the output of `this.logger.log()` calls.
    this.name = "remote-filesystem";

    // Enable lazy loading.
    // This prevents previous loaded full tiddlers to be loaded again. This does not prevent the
    // skinny tiddlers list to be loaded multiple times.
    this.supportsLazyLoading = true;

    // Hook into the `change` event of `wiki` to generate new revision value for modified tiddlers.
    this.wiki.addEventListener("change", (changes) => {
      Object.keys(changes).forEach((title) => {
        if (changes[title].modified) {
          // Not waiting for the `then` on purpose to ensure the revision lock promise is in place.
          getPendingRevisionLock(title).then();

          TIDDLER_PENDING_REVISIONS[title] = getNewRevision(new Date());
          setTimeout(() => resolvePendingRevisionLock(title), 1);
        }
      });
    });

    this.s3Storage = new AwsS3IndexedStorage(() =>
      Promise.resolve(
        localStorage.getItem(AWS_S3_CONNECTION_STRING_STORAGE_KEY)
      )
    );

    this.state = SharedState.getDefaultInstance();
  }

  // Accept an external logger (in this case it's the own logger of the `syncer` module).
  // To use our own logger, don't define this function, then in the constructor:
  // ```
  // this.logger = new $tw.utils.Logger("remote-filesystem", { colour: "blue" });
  // ```
  setLoggerSaveBuffer(logger) {
    this.logger = logger;
  }

  // This function's return value indicates if the state of the wiki is "dirty" or not.
  // This function should only return true if everything is saved successfully, and there is no
  // other pending operation(s).
  isReady() {
    return true;
  }

  // This function returns status information for this module
  getStatus(callback) {
    if (callback) {
      setTimeout(() => {
        // error, is logged in, username, is readonly, is anonymous
        callback(null, true, "test-username", true, false);
      }, 1000);
    }
  }

  // Implement this function is customize the login prompt.
  // RemoteFileSystemAdaptor.prototype.displayLoginPrompt = function(syncer) {};

  login(username, password, callback) {
    this.logger.log("Logging in:", username, password);

    if (callback) {
      callback(null);
    }
  }

  logout(callback) {
    this.logger.log("Logging out");

    if (callback) {
      callback(null);
    }
  }

  // Implement this function to have more control over the "syncing" logic.
  // See https://tiddlywiki.com/dev/#SyncAdaptorModules for what this function does.
  // If this function is implemented, it will be called instead of `getSkinnyTiddlers`.
  // RemoteFileSystemAdaptor.prototype.getUpdatedTiddlers = function(syncer, callback) {};

  async getSkinnyTiddlers(callback) {
    const [indexErr, index] = await this.s3Storage.loadIndex("rfs-test");
    if (!indexErr) {
      this.state.setIndex(index);
    } else {
      console.error("!!! Handle this error", indexErr);
    }

    setTimeout(
      () =>
        callback(
          null,
          index.indexedSkinnyTiddlers.map(({ revision, fields }) =>
            Object.assign({}, fields, {
              revision: revision
            })
          )
        ),
      1
    );
  }

  // Extract the metadata relevant to this specific sync adapter.
  // This metadata is sometimes referred to as `adaptorInfo`.
  getTiddlerInfo(/* tiddler */): AdaptorInfo {
    return { __rfsNamespace: "rfs-test" };
  }

  // Extract the revision information for a tiddler with the given title.
  getTiddlerRevision(title) {
    // The following is the default/built-in behaviour.
    return this.wiki.getTiddler(title).fields.revision;
  }

  async loadTiddler(title, callback) {
    const [err, fields, revision] = await this.s3Storage.loadTiddler(
      "rfs-test",
      title
    );
    if (err) {
      this.logger.log("Error loading tiddler:", title, err);

      callback(err, null);
    } else {
      this.logger.log("Loaded tiddler:", title);

      callback(
        null,
        Object.assign({}, fields, {
          revision: revision
        })
      );
    }
  }

  async saveTiddler(tiddler, callback, options: { tiddlerInfo: TiddlerInfo }) {
    this.logger.log("Saving tiddler:", tiddler.fields.title);

    const {
      tiddlerInfo: {
        adaptorInfo = {} as AdaptorInfo,
        adaptorInfo: { __rfsNamespace = "rfs-test" } = {} as AdaptorInfo
      } = {} as TiddlerInfo
    } = options || {};

    await getPendingRevisionLock(tiddler.fields.title);
    const pendingRevision = TIDDLER_PENDING_REVISIONS[tiddler.fields.title];

    // Only actually persist the tiddler if it's not a transient tiddler.
    if (!this.state.isTransientTiddlerTitle(tiddler.fields.title)) {
      await this.s3Storage.saveTiddler(
        __rfsNamespace,
        tiddler.fields,
        pendingRevision
      );
      this.logger.log("Saved tiddler:", tiddler.fields.title);
    } else {
      this.logger.log(
        "Skipped saving transient tiddler:",
        tiddler.fields.title
      );
    }

    // Clear the pending revision lock and value;
    clearPendingRevisionLock(tiddler.getFieldString("title"));
    delete TIDDLER_PENDING_REVISIONS[tiddler.fields.title];

    const updatedIndex = updateSkinnyTiddlerIndex(
      this.state.getIndex(),
      tiddler.fields,
      pendingRevision
    );
    await this.saveIndex(updatedIndex);
    this.logger.log("Updated tiddler index:", tiddler.fields.title, updatedIndex);

    adaptorInfo.__rfsNamespace = __rfsNamespace || "rfs-test";
    setTimeout(() => callback(null, adaptorInfo, pendingRevision), 1);
  }

  async deleteTiddler(title, callback, options: { tiddlerInfo: TiddlerInfo }) {
    this.logger.log("Deleting tiddler:", title);

    const {
      tiddlerInfo: {
        adaptorInfo: { __rfsNamespace = "rfs-test" } = {} as AdaptorInfo
      } = {} as TiddlerInfo
    } = options || {};

    await this.s3Storage.deleteTiddler(__rfsNamespace, title);
    this.logger.log("Deleted tiddler:", title);

    const updatedIndex = deleteSkinnyTiddlerIndex(this.state.getIndex(), title);
    await this.saveIndex(updatedIndex);
    this.logger.log("Deleted tiddler index:", title, updatedIndex);

    callback(null);
  }

  async saveIndex(index: SkinnyTiddlersIndex) {
    await this.s3Storage.saveIndex("rfs-test", index);
    this.state.setIndex(index);
  }
}

// We have to not export this module at all if we can detect that it's the `tiddlywiki` Node.js CLI
// that's running the code.
//
// The reason for only conditionally exporting this module is because, due to the _unique_ way
// Tiddlywiki's `syncer` module is implemented, if the `syncadaptor` module (i.e. this module
// itself) includes either `getUpdatedTiddlers` or `getSkinnyTiddlers` functions, then the `syncer`
// module will initiate a long-pulling based queue runner system.
//
// While this system is essential for the function of the wiki, it also can not be disabled for the
// CLI. Which means, if the entire purpose of running the `tiddlywiki --build` command is to
// generate a ready-to-use HTML file, then this long-pulling based queue runner system will block
// the CLI process and prevent it from existing.
//
// Although it is TOTALLY FINE to use CTL-C to kill the process in this case, it's also not a very
// clean solution:
//
// * There should be a way to tell `tiddlywiki --build` to just build the HTML without running
//   anything at all
//
// * But there isn't a way to do that, so the best we can do is to just not export this module if
//   we can detect that it's not running in a browder
if ($tw.browser) {
  // @ts-ignore
  exports.adaptorClass = RemoteFileSystemAdaptor;
}
