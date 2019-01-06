/* @flow */

const capture_endpoint = 'capture';

function port(): string {
    return "12212";
}

// none means do not use tags
export function defaultTagStr (): ?string {
    return 'grasp';
}

export function capture_url (): string {
    return `http://localhost:${port()}/${capture_endpoint}`;
}
