// Local-first persistence backed by IndexedDB (via idb-keyval).
// No backend, no account, no sync — everything lives in this browser only.
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export const storage = {
  async get(key) {
    try {
      const value = await idbGet(key);
      if (value === undefined) return null;
      return { key, value };
    } catch (e) {
      console.error("storage.get failed", e);
      return null;
    }
  },
  async set(key, value) {
    try {
      await idbSet(key, value);
      return { key, value };
    } catch (e) {
      console.error("storage.set failed", e);
      return null;
    }
  },
  async delete(key) {
    try {
      await idbDel(key);
      return { key, deleted: true };
    } catch (e) {
      console.error("storage.delete failed", e);
      return null;
    }
  }
};
