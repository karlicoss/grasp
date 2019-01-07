#!/usr/bin/python3
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import re
from typing import List

from org_tools import append_org_entry

CAPTURE_PATH_VAR = 'GRASP_CAPTURE_PATH'

def log(*things):
    # TODO proper logging
    print(*things)


def capture(
        url,
        title,
        selection,
        comment,
        tag_str,
):
    def empty(s) -> bool:
        return s is None or len(s.strip()) == 0

    log("capturing", url, title, selection, comment)

    capture_path = Path(os.environ[CAPTURE_PATH_VAR]).expanduser()

    heading = url
    parts = []
    tags: List[str] = []
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
        'path': str(capture_path),
    }
    # try:
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
    # just rely on setting 500 instead
    # except Exception as e:
    #     log(str(e))
    #     response.update({
    #         'status': 'error',
    #         'error' : str(e),
    #     })

    return json.dumps(response).encode('utf8')



class GraspRequestHandler(BaseHTTPRequestHandler):
    def handle_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode('utf8'))
        log("incoming request:")
        log(payload)
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
        try:
            self.handle_POST()
        except Exception as e:
            log("Error during processing")
            log(str(e))
            self.respond_error(message=str(e))


def run(port: str, capture_path: str):
    # not sure if there is a simpler way to communicate with the server...
    os.environ[CAPTURE_PATH_VAR] = capture_path
    httpd = HTTPServer(('', int(port)), GraspRequestHandler)
    log(f"Starting httpd on port {port}")
    httpd.serve_forever()

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
