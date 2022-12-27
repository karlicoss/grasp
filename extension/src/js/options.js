/* @flow */

export type Options = {
    endpoint: string;
    default_tags: string;
    notification: boolean;
}


function defaultOptions(): Options {
    return {
        endpoint: "http://localhost:12212/capture",
        default_tags: "grasp",
        notification: true,
    }
}


export async function getOptions(): Promise<Options> {
    const res = await browser.storage.local.get(null)
    return {...defaultOptions(), ...res}
}


export async function setOptions(opts: Options): Promise<void> {
    console.log('Saving %o', opts)
    await browser.storage.local.set(opts)
}
