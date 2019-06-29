#!/usr/bin/python3
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import logging
from pathlib import Path
import re
from typing import List, Optional

from org_tools import as_org, empty, DEFAULT_TEMPLATE

CAPTURE_PATH_VAR = 'GRASP_CAPTURE_PATH'
CAPTURE_TEMPLATE_VAR = 'GRASP_CAPTURE_TEMPLATE'


def get_logger():
    return logging.getLogger('grasp-server')

def append_org(
        path: Path,
        org: str
):
    logger = get_logger()
    # TODO perhaps should be an error?...
    if not path.exists():
        logger.warning("path %s didn't exist!", path)
    # https://stackoverflow.com/a/13232181
    if len(org.encode('utf8')) > 4096:
        logger.warning("writing out %s might be non-atomic", org)
    with path.open('a') as fo:
        fo.write(org)


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
    logger.info('capturing %s to %s', (url, title, selection, comment, tag_str), capture_path)

    url = safe(url)
    title = safe(title)
    selection = safe(selection)
    comment = safe(comment)
    tag_str = safe(tag_str)

    tags: List[str] = []
    if not empty(tag_str):
        tags = re.split(r'[\s,]', tag_str)
        tags = [t for t in tags if not empty(t)] # just in case

    org = as_org(
        url=url,
        title=title,
        selection=selection,
        comment=comment,
        tags=tags,
        org_template=org_template,
    )
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


def run(port: str, capture_path: str, template: str):
    logger = get_logger()
    logger.info("Using template %s", template)

    # not sure if there is a simpler way to communicate with the server...
    os.environ[CAPTURE_PATH_VAR] = capture_path
    os.environ[CAPTURE_TEMPLATE_VAR] = template
    httpd = HTTPServer(('', int(port)), GraspRequestHandler)
    logger.info(f"Starting httpd on port {port}")
    httpd.serve_forever()

def setup_parser(p):
    p.add_argument('--port', type=str, default='12212', help='Port for communicating with extension')
    p.add_argument('--path', type=str, default='~/capture.org', help='File to capture into')
    p.add_argument('--template', type=str, default=DEFAULT_TEMPLATE, help=f"""
    {as_org.__doc__}
    """)

def main():
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s')

    p = argparse.ArgumentParser('grasp server', formatter_class=lambda prog: argparse.ArgumentDefaultsHelpFormatter(prog, width=100)) # type: ignore
    setup_parser(p)
    args = p.parse_args()
    run(args.port, args.path, args.template)

if __name__ == '__main__':
    main()
