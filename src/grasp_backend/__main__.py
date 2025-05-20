from __future__ import annotations

import argparse
import json
import logging
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any, Optional

from .org_tools import DEFAULT_TEMPLATE, Config, as_org, empty

# fmt: off
CAPTURE_PATH_VAR     = 'GRASP_CAPTURE_PATH'
CAPTURE_TEMPLATE_VAR = 'GRASP_CAPTURE_TEMPLATE'
CAPTURE_CONFIG_VAR   = 'GRASP_CAPTURE_CONFIG'
# fmt: on


def get_logger() -> logging.Logger:
    return logging.getLogger(__package__)


def append_org(path: Path, org: str) -> None:
    logger = get_logger()
    # TODO perhaps should be an error?...
    if not path.exists():
        logger.warning("path %s didn't exist!", path)
    # https://stackoverflow.com/a/13232181
    if len(org.encode('utf8')) > 4096:
        logger.warning("writing out %s might be non-atomic", org)
    with path.open('a') as fo:
        fo.write(org)


from functools import lru_cache


@lru_cache(1)
def capture_config() -> Optional[Config]:
    cvar = os.environ.get(CAPTURE_CONFIG_VAR)
    if cvar is None:
        return None

    globs: dict[str, Any] = {}
    exec(Path(cvar).read_text(), globs)
    ConfigClass = globs['Config']
    return ConfigClass()


def capture(
    url: str,
    title,
    selection,
    comment,
    tag_str,
):
    logger = get_logger()

    # protect strings against None
    def safe(s: Optional[str]) -> str:
        if s is None:
            return ''
        else:
            return s

    capture_path = Path(os.environ[CAPTURE_PATH_VAR]).expanduser()
    org_template = os.environ[CAPTURE_TEMPLATE_VAR]
    config = capture_config()
    logger.info('capturing %s to %s', (url, title, selection, comment, tag_str), capture_path)

    url = safe(url)
    title = safe(title)
    selection = safe(selection)
    comment = safe(comment)
    tag_str = safe(tag_str)

    tags: list[str] = []
    if not empty(tag_str):
        tags = re.split(r'[\s,]', tag_str)
        tags = [t for t in tags if not empty(t)]  # just in case

    # fmt: off
    org = as_org(
        url=url,
        title=title,
        selection=selection,
        comment=comment,
        tags=tags,
        org_template=org_template,
        config=config,
    )
    # fmt: on
    append_org(
        path=capture_path,
        org=org,
    )

    response = {
        'path': str(capture_path),
        'status': 'ok',
    }
    return json.dumps(response).encode('utf8')


class GraspRequestHandler(BaseHTTPRequestHandler):
    def handle_POST(self):
        logger = get_logger()

        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode('utf8'))
        logger.info("incoming request %s", payload)
        res = capture(**payload)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(res)

    def respond_error(self, message: str):
        self.send_response(500)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(message.encode('utf8'))

    def do_POST(self):
        logger = get_logger()
        try:
            self.handle_POST()
        except Exception as e:
            logger.error("Error during processing")
            logger.exception(e)
            self.respond_error(message=str(e))


def run(*, port: str, capture_path: str, template: str, config: Optional[Path]) -> None:
    logger = get_logger()
    logger.info("Using template %s", template)

    # not sure if there is a simpler way to communicate with the server...
    os.environ[CAPTURE_PATH_VAR] = capture_path
    os.environ[CAPTURE_TEMPLATE_VAR] = template
    if config is not None:
        os.environ[CAPTURE_CONFIG_VAR] = str(config)
    httpd = HTTPServer(('', int(port)), GraspRequestHandler)
    logger.info(f"Starting httpd on port {port}")
    httpd.serve_forever()


def setup_parser(p) -> None:
    p.add_argument('--port', type=str, default='12212', help='Port for communicating with extension')
    p.add_argument('--path', type=str, default='~/capture.org', help='File to capture into')
    p.add_argument(
        '--template',
        type=str,
        default=DEFAULT_TEMPLATE,
        help=f"""
    {as_org.__doc__}
    """,
    )
    abspath = lambda p: str(Path(p).absolute())
    p.add_argument('--config', type=abspath, required=False, help='Optional dynamic config')


def main() -> None:
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s')

    from . import setup

    p = argparse.ArgumentParser('grasp server', formatter_class=lambda prog: argparse.ArgumentDefaultsHelpFormatter(prog, width=100))
    subp = p.add_subparsers(dest='mode')
    setup_p = subp.add_parser('setup')
    setup.setup_parser(setup_p)
    serve_p = subp.add_parser('serve')
    setup_parser(serve_p)

    args = p.parse_args()

    if args.mode == 'serve':
        run(port=args.port, capture_path=args.path, template=args.template, config=args.config)
    elif args.mode == 'setup':
        setup.setup(args)
    else:
        raise RuntimeError(args.mode)


if __name__ == '__main__':
    main()
