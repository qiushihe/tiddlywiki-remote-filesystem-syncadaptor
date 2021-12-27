import { TextEncoder, TextDecoder } from "util";
import { Crypto } from "@peculiar/webcrypto";

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
globalThis.crypto = new Crypto();
