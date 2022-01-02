export type ConnectionInfo = {
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
};

export type DecodedSkinnyTiddlerIndexKey = {
  isValid: boolean;
  key: string;
  namespace: string;
  title: string;
  isSkinny: boolean;
};

export type SkinnyTiddlersIndex = {
  rebuiltAt: Date;
  allDecodedKeys: DecodedSkinnyTiddlerIndexKey[];
  indexedSkinnyTiddlers: {
    revision: string;
    fields: {
      title?: string;
      [key: string]: unknown;
    };
  }[];
};

export type AdaptorInfo = {
  __rfsNamespace: string;
};

export type TiddlerInfo = {
  adaptorInfo: AdaptorInfo;
};
