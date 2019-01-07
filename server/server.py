#!/usr/bin/python3
import argparse
import json
import re
import os
from pathlib import Path

import hug # type: ignore
import hug.types as T # type: ignore

from org_tools import append_org_entry

CAPTURE_PATH_VAR = 'GRASP_CAPTURE_PATH'

def empty(s) -> bool:
    return s is None or len(s.strip()) == 0

def log(*things):
    # TODO proper logging
    print(*things)

# TODO allow to pass tags??
@hug.local()
@hug.post('/capture')
def capture(
        url: T.text,
        title: T.Nullable(T.text),
        selection: T.Nullable(T.text),
        comment: T.Nullable(T.text),
        tag_str: T.Nullable(T.text),
):
    log("capturing", url, title, selection, comment)

    capture_path = Path(os.environ[CAPTURE_PATH_VAR]).expanduser()

    heading = url
    parts = []
    tags = []
    if not empty(tag_str):
        tags = re.split('[\s,]', tag_str)
        tags = [t for t in tags if not empty(t)] # just in case

    if not empty(title):
        heading = title
        parts.append(url)

    # TODO not sure, maybe add as org quote?
    if not empty(selection):
        parts.extend([
            'Selection:',
            selection, # TODO tabulate?
        ])
    if not empty(comment):
        parts.extend([
            'Comment:',
            comment
        ])
    body = None if len(parts) == 0 else '\n'.join(parts)

    # TODO format response on extension site
    response = {
        'file': str(capture_path),
    }
    try:
        append_org_entry(
            capture_path,
            heading=heading,
            body=body,
            tags=tags,
            todo=False,
        )
        response.update({
            'status': 'ok',
        })
    except Exception as e:
        log(str(e))
        response.update({
            'status': 'error',
            'error' : str(e),
        })

    return json.dumps(response).encode('utf8')

def run(port: str, capture_path: str):
    env = os.environ.copy()
    # not sure if there is a simpler way to communicate with the server...
    env[CAPTURE_PATH_VAR] = capture_path
    os.execvpe(
        'hug',
        [
            'grasp-server',
            '-p', port,
            '-f', __file__,
        ],
        env,
    )

def setup_parser(p):
    p.add_argument('--port', type=str, default='12212', help='Port for communicating with extension')
    p.add_argument('--path', type=str, default='~/capture.org', help='File to capture into')

def main():
    p = argparse.ArgumentParser('grasp server setup', formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    setup_parser(p)
    args = p.parse_args()
    run(args.port, args.path)

if __name__ == '__main__':
    main()
