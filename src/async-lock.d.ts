declare module "$:/plugins/qiushihe/remote-filesystem/async-lock.js" {
  export class AsyncLock {
    constructor(options?: {
      timeout: number;
      maxOccupationTime: number;
      maxPending: number;
    });

    isBusy(key: string): boolean;

    acquire(
      key: string,
      fn: (...args: any[]) => any,
      opts?: Record<string, any>
    ): Promise<any> | undefined;
  }
}
