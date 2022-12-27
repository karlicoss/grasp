/* @flow */

/*
 * Based on https://github.com/Shraymonks/flow-interfaces-chrome
 * not sure if browser polyfill has flow types??
 * https://github.com/mozilla/webextension-polyfill/issues/421
 */


type browser$StorageArea = {
  get: (keys: string | Array<string> | Object | null) => Promise<Object>,
  set: (items: Object) => Promise<void>,
}


type browser$storage = {
  local: browser$StorageArea,
  managed: browser$StorageArea,
  sync: browser$StorageArea,
}


declare var browser: {
  storage: browser$storage,
}
