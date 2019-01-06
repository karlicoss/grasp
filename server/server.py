"""First API, local access only"""
import json
import re

import hug # type: ignore
import hug.types as T # type: ignore

from config import CAPTURE_PATH # TODO mm, maybe configure it during server setup?
from org_tools import append_org_entry

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


    response = {
        'file': str(CAPTURE_PATH),
    }
    try:
        append_org_entry(
            CAPTURE_PATH,
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
