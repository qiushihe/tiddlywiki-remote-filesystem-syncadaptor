declare module "$:/plugins/qiushihe/remote-filesystem/awsS3Storage.js" {
  export class AwsS3Storage {
    constructor(getConnectionString: () => Promise<string>);

    saveTiddler(
      namespace: string,
      fields: Record<string, unknown>,
      revision: string
    ): Promise<[Error]>;

    loadTiddler(
      namespace: string,
      title: string
    ): Promise<[Error, Record<string, unknown>, string]>;

    deleteTiddler(namespace: string, title: string): Promise<Error>;
  }
}
