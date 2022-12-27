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


type browser$Permissions = {
  origins?: Array<string>,
  permissions?: Array<string>,
}


type browser$permissions = {
  contains: (permissions: browser$Permissions) => Promise<boolean> /*result*/,
  request : (permissions: browser$Permissions) => Promise<boolean> /*granted*/,
}

declare var browser: {
  storage: browser$storage,
  permissions: browser$permissions,
}
