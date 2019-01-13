/* @flow */

const capture_endpoint = 'capture';

type Options = {
    port: string;
    default_tags: string;
    notification: boolean;
}

function default_options(): Options {
    return {
        port: "12212",
        default_tags: "grasp",
        notification: true,
    };
}

export function get_options(cb: (Options) => void)  {
    chrome.storage.local.get(null, res => {
        res = {...default_options(), ...res};
        cb(res);
    });
}

export function set_options(opts: Options, cb: () => void) {
    console.log('Saving %s', JSON.stringify(opts));
    chrome.storage.local.set(opts, cb);
}

export function capture_url(options: Options): string {
    return `http://localhost:${options.port}/${capture_endpoint}`;
}
