/*\
title: $:/plugins/qiushihe/remote-filesystem/remote-filesystem-adaptor.js
type: application/javascript
module-type: syncadaptor
A sync adaptor module for synchronising with a remote filesystem
\*/

import { uuidv4 } from "$:/plugins/qiushihe/remote-filesystem/uuidv4.js";

import { Wiki, Logger } from "../types/tiddlywiki";

const DUMMY_TIDDLERS = [
  {
    __rfsNamespace: "dummy-namespace",
    created: new Date(),
    creator: "dummy-creator",
    modified: new Date(),
    modifier: "dummy-modifier",
    type: "text/vnd.tiddlywiki",
    title: "test test test",
    text: "test test test text yo!",
    tags: [],
    list: []
  },
  {
    __rfsNamespace: "dummy-namespace",
    created: new Date(),
    creator: "dummy-creator",
    modified: new Date(),
    modifier: "dummy-modifier",
    type: "text/vnd.tiddlywiki",
    title: "dummy dummy dummy",
    text: "dummy dummy dummy text yo!",
    tags: [],
    list: []
  }
];

const DUMMY_TIDDLER_REVISIONS = {
  "test test test": uuidv4(),
  "dummy dummy dummy": uuidv4()
};

const DUMMY_TIDDLER_PENDING_REVISIONS = {};

class RemoteFileSystemAdaptor {
  wiki: Wiki;
  logger: Logger;
  name: string;
  supportsLazyLoading: boolean;

  constructor(options) {
    this.wiki = options.wiki;

    // This `name` is also prefixed to the output of `this.logger.log()` calls.
    this.name = "remote-filesystem";

    // Enable lazy loading.
    // This prevents previous loaded full tiddlers to be loaded again. This does not prevent the
    // skinny tiddlers list to be loaded multiple times.
    this.supportsLazyLoading = true;

    // Hook into the "saving tiddler" hook to manipulate revision value.
    // The way the `syncer` module works is by listening to the `change` event on the `$tw.wiki`
    // object. This means that by the time the `syncer` module (and in turn this module) gets to do
    // anything, the core `$tw.wiki` has already "saved" the tiddler (and we're just syncing those
    // changes to a remote place).
    // So here we intercept the hook, advance the revision value for the tiddler and store the new
    // revision value in a "pending" index.
    // In `saveTiddler` below, if the saving operation is successful, we'll apply the pending
    // revision value to the non-pending revision index.
    $tw.hooks.addHook("th-saving-tiddler", (tiddler) => {
      DUMMY_TIDDLER_PENDING_REVISIONS[tiddler.fields.title] = uuidv4();

      return Object.assign({}, tiddler.fields, {
        revision: DUMMY_TIDDLER_PENDING_REVISIONS[tiddler.fields.title]
      });
    });
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

  getSkinnyTiddlers(callback) {
    callback(
      null,
      DUMMY_TIDDLERS.map(function (tiddler) {
        return Object.assign({}, tiddler, {
          text: undefined,
          revision: DUMMY_TIDDLER_REVISIONS[tiddler.title]
        });
      })
    );
  }

  // Extract the metadata relevant to this specific sync adapter.
  // These metadata are sometimes referred to as `adaptorInfo`.
  getTiddlerInfo(tiddler) {
    const namespace = tiddler.fields.__rfsNamespace;
    if (namespace) {
      this.logger.log(
        "Got tiddler info",
        tiddler.fields.title,
        "namespace:",
        namespace
      );

      return {
        __rfsNamespace: namespace
      };
    } else {
      return {};
    }
  }

  // Extract the revision information for a tiddler with the given title.
  getTiddlerRevision(title) {
    // The following is the default/built-in behaviour.
    return this.wiki.getTiddler(title).fields.revision;
  }

  loadTiddler(title, callback) {
    const tiddler = DUMMY_TIDDLERS.find(function (tiddler) {
      return tiddler.title === title;
    });

    if (tiddler) {
      setTimeout(() => {
        this.logger.log("Loaded tiddler:", title);

        callback(
          null,
          Object.assign({}, tiddler, {
            revision: DUMMY_TIDDLER_REVISIONS[tiddler.title]
          })
        );
      }, 1000);
    } else {
      setTimeout(() => {
        this.logger.log("Error loading tiddler:", title);

        callback(new Error("Error loading tiddler: " + title), null);
      }, 1000);
    }
  }

  saveTiddler(tiddler, callback, options) {
    this.logger.log(
      "Save tiddler:",
      tiddler.getFieldStrings({ exclude: [] }),
      options
    );

    const tiddlerInfo = options.tiddlerInfo || {};
    const adaptorInfo = tiddlerInfo.adaptorInfo || {};

    adaptorInfo.__rfsNamespace =
      adaptorInfo.__rfsNamespace || tiddler.__rfsNamespace;

    // Assuming the saving operation is successful, here we apply the "pending" revision value to
    // the non-pending revision index, ...
    DUMMY_TIDDLER_REVISIONS[tiddler.fields.title] =
      DUMMY_TIDDLER_PENDING_REVISIONS[tiddler.fields.title];
    // ... and clear the pending value from the pending index.
    delete DUMMY_TIDDLER_PENDING_REVISIONS[tiddler.fields.title];

    callback(null, adaptorInfo, DUMMY_TIDDLER_REVISIONS[tiddler.fields.title]);
  }

  deleteTiddler(title, callback, options) {
    this.logger.log("Delete tiddler:", title);

    callback(null, null);
  }
}

// export const adaptorClass = RemoteFileSystemAdaptor;

// We have to not export this module at all if we can detect that it's the `tiddlywiki` Node.js CLI
// that's running the code.
//
// The reason for only conditionally exporting this module is because, due to the _unique_ way
// Tiddlywiki's `syncer` module is implemented, if the syncadaptor modeil (i.e.) this module itself
// includes either `getUpdatedTiddlers` or `getSkinnyTiddlers` functions, then the `syncer` module
// will initiate a long-pulling based queue runner system.
//
// While this system is essential for the function of the wiki, it also can not be disabled for the
// CLI. Which means, if the entire purpose of running the `tiddlywiki --build` command is to
// generate a ready-to-use HTML file, then this long-pulling based queue runner system will block
// the CLI process and prevent it from existing.
//
// Although it is TOTALL FINE to use CTL-C to kill the process in this case, it's also not a very
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
