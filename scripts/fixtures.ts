/** TEST-ONLY re-export of the demo data (the app itself loads it only on request). */
import { FIXED_STORES } from "../lib/sample";
export { APP_HEADERS, TERR_HEADERS, STORE_HEADERS } from "../lib/sample";
export { SAMPLE_APPS, SAMPLE_TERRITORIES } from "../lib/demo";
export const SAMPLE_STORES = FIXED_STORES;
