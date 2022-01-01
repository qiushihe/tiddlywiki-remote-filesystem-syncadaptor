export type ConnectionInfo = {
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
};

export type SkinnyTiddlersIndex = {
  rebuiltAt: Date;
  allKeys: string[];
  indexedSkinnyTiddlers: {
    revision: string;
    fields: Record<string, unknown>;
  }[];
};

export type AdaptorInfo = {
  __rfsNamespace: string;
};

export type TiddlerInfo = {
  adaptorInfo: AdaptorInfo;
};
