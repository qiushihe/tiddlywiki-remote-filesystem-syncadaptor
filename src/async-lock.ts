/*\
title: $:/plugins/qiushihe/remote-filesystem/async-lock.js
type: application/javascript
module-type: library
Lock on asynchronous code for Nodejs
\*/

// Based on: https://github.com/rogierschouten/async-lock

const DEFAULT_TIMEOUT = 0; // Never
const DEFAULT_MAX_OCCUPATION_TIME = 0; // Never
const DEFAULT_MAX_PENDING = 1000;

export class AsyncLock {
  timeout: number;
  maxOccupationTime: number;
  maxPending: number;

  // If `queues[key] = null` then that means no job running for key.
  queues: Record<string, (() => any)[]>;

  constructor(options?: {
    timeout: number;
    maxOccupationTime: number;
    maxPending: number;
  }) {
    options = options || {
      timeout: undefined,
      maxOccupationTime: undefined,
      maxPending: undefined
    };

    this.queues = {};
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.maxOccupationTime =
      options.maxOccupationTime || DEFAULT_MAX_OCCUPATION_TIME;

    if (
      options.maxPending === Infinity ||
      (Number.isInteger(options.maxPending) && options.maxPending >= 0)
    ) {
      this.maxPending = options.maxPending;
    } else {
      this.maxPending = DEFAULT_MAX_PENDING;
    }
  }

  isBusy(key: string): boolean {
    if (!key) {
      return Object.keys(this.queues).length > 0;
    } else {
      return !!this.queues[key];
    }
  }

  acquire(
    key: string,
    fn: (...args: any[]) => any,
    opts?: Record<string, any>
  ): Promise<any> {
    if (typeof fn !== "function") {
      throw new Error("You must pass a function to execute");
    }

    let deferredResolve = null;
    let deferredReject = null;

    const deferred = new Promise((resolve, reject) => {
      deferredResolve = resolve;
      deferredReject = reject;
    });

    opts = opts || {};

    let resolved = false;
    let timer = null;
    let occupationTimer = null;

    const done = (locked, err?, ret?) => {
      if (occupationTimer) {
        clearTimeout(occupationTimer);
        occupationTimer = null;
      }

      if (locked) {
        if (!!this.queues[key] && this.queues[key].length === 0) {
          delete this.queues[key];
        }
      }

      if (!resolved) {
        if (err) {
          deferredReject(err);
        } else {
          deferredResolve(ret);
        }
        resolved = true;
      }

      if (locked) {
        // run next queued function
        if (!!this.queues[key] && this.queues[key].length > 0) {
          this.queues[key].shift()();
        }
      }
    };

    const exec = (locked) => {
      // may due to timed out
      if (resolved) {
        return done(locked);
      }

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      // Callback mode
      if (fn.length === 1) {
        let called = false;
        fn((err, ret) => {
          if (!called) {
            called = true;
            done(locked, err, ret);
          }
        });
      }
      // Promise mode
      else {
        this._promiseTry(() => {
          return fn();
        }).then(
          function (ret) {
            done(locked, undefined, ret);
          },
          function (error) {
            done(locked, error);
          }
        );
      }
    };

    if (!this.queues[key]) {
      this.queues[key] = [];
      exec(true);
    } else if (this.queues[key].length >= this.maxPending) {
      done(false, new Error("Too much pending tasks"));
    } else {
      const taskFn = function () {
        exec(true);
      };
      if (opts.skipQueue) {
        this.queues[key].unshift(taskFn);
      } else {
        this.queues[key].push(taskFn);
      }

      const timeout = opts.timeout || this.timeout;
      if (timeout) {
        timer = setTimeout(() => {
          timer = null;
          done(false, new Error("async-lock timed out"));
        }, timeout);
      }
    }

    const maxOccupationTime = opts.maxOccupationTime || this.maxOccupationTime;
    if (maxOccupationTime) {
      occupationTimer = setTimeout(() => {
        if (!!this.queues[key]) {
          done(false, new Error("Maximum occupation time is exceeded"));
        }
      }, maxOccupationTime);
    }

    return deferred;
  }

  _promiseTry(fn: () => unknown): Promise<unknown> {
    try {
      return Promise.resolve(fn());
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
