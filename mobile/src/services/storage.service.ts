// MMKV-based storage — faster than AsyncStorage, synchronous reads
// Install: npm install react-native-mmkv

let storage: any = null;

function getStorage() {
  if (!storage) {
    const { MMKV } = require('react-native-mmkv');
    storage = new MMKV({ id: 'worksphere-storage' });
  }
  return storage;
}

export const StorageService = {
  set(key: string, value: string): void {
    getStorage().set(key, value);
  },
  get(key: string): string | undefined {
    return getStorage().getString(key);
  },
  delete(key: string): void {
    getStorage().delete(key);
  },
  contains(key: string): boolean {
    return getStorage().contains(key);
  },
};

export const StorageKeys = {
  ACCESS_TOKEN:  'ws_access_token',
  REFRESH_TOKEN: 'ws_refresh_token',
  USER:          'ws_user',
};
