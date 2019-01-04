/* @flow */

// TODO configure port in options?
const capture_endpoint = 'capture';
const port = 8000;

export function capture_url (): string {
    return `http://localhost:${port}/${capture_endpoint}`;
}
