/*\
title: $:/plugins/qiushihe/remote-filesystem/remote-filesystem-adaptor.js
type: application/javascript
module-type: syncadaptor
A sync adaptor module for synchronising with a remote filesystem
\*/

import { decodeConnectionString } from "$:/plugins/qiushihe/remote-filesystem/awsS3Storage.js";
import { AwsS3IndexedStorage } from "$:/plugins/qiushihe/remote-filesystem/awsS3IndexedStorage.js";
import { SharedState } from "$:/plugins/qiushihe/remote-filesystem/sharedState.js";
import { encode } from "$:/plugins/qiushihe/remote-filesystem/base62.js";
import { AsyncLock } from "$:/plugins/qiushihe/remote-filesystem/async-lock.js";

import { Wiki, Logger, TiddlerFields } from "../types/tiddlywiki";
import { AdaptorInfo, SkinnyTiddlersIndex, TiddlerInfo } from "../types/types";

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

const deleteSkinnyTiddlerIndex = (
  index: SkinnyTiddlersIndex,
  title: string
): SkinnyTiddlersIndex => {
  if (!index) {
    console.error("!!! Not deleting skinny tiddler index: Index missing.");
    return null;
  }

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
  if (!index) {
    console.error("!!! Not updating skinny tiddler index: Index missing.");
    return null;
  }

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

  const updatedFields = Object.assign({}, fields, { text: undefined });

  // Clear out the `text` field to store the "skinny" version of the tiddler.
  delete updatedFields["text"];

  // Also delete nil keys.
  Object.keys(updatedFields).forEach((key) => {
    if (updatedFields[key] === null || updatedFields[key] === undefined) {
      delete updatedFields[key];
    }
  });

  _index.indexedSkinnyTiddlers.push({
    fields: updatedFields,
    revision: revision
  });

  return _index;
};

class RemoteFileSystemAdaptor {
  wiki: Wiki;
  logger: Logger;
  name: string;
  supportsLazyLoading: boolean;
  state: SharedState;
  s3Storage: AwsS3IndexedStorage;
  tiddlerRevision: Record<string, string>;
  lock: AsyncLock;

  constructor(options) {
    this.wiki = options.wiki;

    // This `name` is also prefixed to the output of `this.logger.log()` calls.
    this.name = "remote-filesystem";

    // Enable lazy loading.
    // This prevents previous loaded full tiddlers to be loaded again. This does not prevent the
    // skinny tiddlers list to be loaded multiple times.
    this.supportsLazyLoading = true;

    this.state = SharedState.getDefaultInstance();

    this.s3Storage = new AwsS3IndexedStorage(() =>
      Promise.resolve(this.state.readAwsS3ConnectionString())
    );

    this.tiddlerRevision = {};

    this.lock = new AsyncLock();
  }

  // Accept an external logger (in this case it's the own logger of the `syncer` module).
  // To use our own logger, don't define this function, then in the constructor:
  // ```
  // this.logger = new $tw.utils.Logger("remote-filesystem", { colour: "blue" });
  // ```
  setLoggerSaveBuffer(logger) {
    this.logger = logger;
  }

  // The return value of this function indicates if this module is ready to accept new save/load
  // operations or not. If there are still pending requests inflight, then this function should
  // return `false`.
  isReady(): boolean {
    return true;
  }

  // This function returns status information for this module
  // The parameters for `callback` are: (error, is logged in, username, is readonly, is anonymous)
  getStatus(callback) {
    if (this.state.hasAwsS3ConnectionString()) {
      const { username } = decodeConnectionString(
        this.state.readAwsS3ConnectionString()
      );

      if (callback) {
        callback(null, true, username, false, false);
      }
    } else {
      if (callback) {
        callback(null, false, null, false, false);
      }
    }
  }

  async getApiLock(): Promise<(err: Error, ret: any) => void> {
    let resolvePromise;
    const promise: Promise<(err: Error, ret: any) => void> = new Promise(
      (resolve) => {
        resolvePromise = resolve;
      }
    );

    this.lock
      .acquire("api", (done) => {
        resolvePromise(done);
      })
      // Ignore this promise chain because we only care about resolving the promise after getting
      // the lock, but we don't want to block the returning of the promise before getting the lock.
      .then();

    return promise;
  }

  async getSkinnyTiddlers(callback) {
    const doneApiLock = await this.getApiLock();

    const [indexErr, index] = await this.s3Storage.loadIndex("rfs-test");
    if (!indexErr) {
      this.state.setIndex(index);
    } else {
      console.error("!!! Handle this error", indexErr);
    }

    if (index) {
      // Replace locally stored tiddler revisions with values from the index.
      this.tiddlerRevision = {};
      index.indexedSkinnyTiddlers.forEach(({ revision, fields }) => {
        this.tiddlerRevision[fields.title] = revision;
      });

      callback(
        null,
        index.indexedSkinnyTiddlers.map(({ revision, fields }) =>
          Object.assign({}, fields, {
            // The `revision` value has to be merged with `fields` here due to how this part of
            // the `syncer` module works.
            // In all other parts of the `syncer` module's operation, the `getTiddlerRevision`
            // function is used to extract tiddler revision from a locally stored index inside
            // this `syncadaptor` module.
            revision: revision
          })
        )
      );
    } else {
      // TODO: Detect the reason for not having `index`: If it's because connection string is not
      //       set then it's fine to call `callback` with `null` as the first parameter; Otherwise
      //       we should call `callback` with `new Error("SOME REASON")` as the first parameter.
      callback(null, []);
    }

    doneApiLock(null, null);
  }

  // Extract the metadata relevant to this specific sync adapter.
  getTiddlerInfo(/* tiddler */): AdaptorInfo {
    return { __rfsNamespace: "rfs-test" };
  }

  // Extract the revision information for a tiddler with the given title.
  getTiddlerRevision(title) {
    return this.tiddlerRevision[title];
  }

  async loadTiddler(title, callback) {
    const doneApiLock = await this.getApiLock();

    this.logger.log("Loading tiddler:", title);

    const [err, fields, revision] = await this.s3Storage.loadTiddler(
      "rfs-test",
      title
    );
    if (err) {
      this.logger.log("Error loading tiddler:", title, err);

      callback(err, null);
    } else {
      this.logger.log("Loaded tiddler:", title);

      // Update locally stored tiddler revision
      this.tiddlerRevision[title] = revision;

      callback(null, fields);
    }

    doneApiLock(null, null);
  }

  async saveTiddler(tiddler, callback, options: { tiddlerInfo: TiddlerInfo }) {
    const doneApiLock = await this.getApiLock();

    this.logger.log("Saving tiddler:", tiddler.fields.title);

    const {
      tiddlerInfo: {
        adaptorInfo = {} as AdaptorInfo,
        adaptorInfo: { __rfsNamespace = "rfs-test" } = {} as AdaptorInfo
      } = {} as TiddlerInfo
    } = options || {};

    // Grab a copy of the of tiddler's fields for further manipulation.
    const tiddlerFields = Object.assign({}, tiddler.fields);

    // Ensure the `revision` value is not part of the tiddler's own fields.
    // The `revision` value only need to be part of the tiddler's fields for the one place in the
    // `syncer` module during processing of the result of `getSkinnyTiddlers`. In all other places,
    // the tiddler's revision is obtained from the `getTiddlerRevision` call. So here we explicitly
    // delete the `revision` value from the tiddler's own fields to ensure it's not used for any
    // unintended purposes.
    delete tiddlerFields["revision"];

    const newRevision = getNewRevision(new Date());

    // Only actually persist the tiddler if it's not a transient tiddler.
    if (!this.state.isTransientTiddlerTitle(tiddlerFields.title)) {
      await this.s3Storage.saveTiddler(
        __rfsNamespace,
        tiddlerFields,
        newRevision
      );
      this.logger.log("Saved tiddler:", tiddlerFields.title);
    } else {
      this.logger.log("Skipped saving transient tiddler:", tiddlerFields.title);
    }

    const updatedIndex = updateSkinnyTiddlerIndex(
      this.state.getIndex(),
      tiddlerFields,
      newRevision
    );
    await this.saveIndex(updatedIndex);
    this.logger.log("Updated tiddler index:", tiddlerFields.title);

    // Update locally stored tiddler revision
    this.tiddlerRevision[tiddlerFields.title] = newRevision;

    adaptorInfo.__rfsNamespace = __rfsNamespace || "rfs-test";
    callback(null, adaptorInfo, newRevision);

    doneApiLock(null, null);
  }

  async deleteTiddler(title, callback, options: { tiddlerInfo: TiddlerInfo }) {
    const doneApiLock = await this.getApiLock();

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
    this.logger.log("Deleted tiddler index:", title);

    // Delete locally stored tiddler revision
    delete this.tiddlerRevision[title];

    callback(null);

    doneApiLock(null, null);
  }

  async saveIndex(index: SkinnyTiddlersIndex) {
    await this.s3Storage.saveIndex("rfs-test", index);
    this.state.setIndex(index);
  }

  // Implement this function to customize the login prompt.
  // RemoteFileSystemAdaptor.prototype.displayLoginPrompt = function(syncer) {};

  // Implement this function to handle login requests
  // login(username, password, callback) {}

  // Implement this function to handle log out requests
  // logout(callback) {}

  // Implement this function to have more control over the "syncing" logic.
  // See https://tiddlywiki.com/dev/#SyncAdaptorModules for what this function does.
  // If this function is implemented, it will be called instead of `getSkinnyTiddlers`.
  // RemoteFileSystemAdaptor.prototype.getUpdatedTiddlers = function(syncer, callback) {};
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
