import sys
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from time import sleep

import requests

from ..__main__ import get_logger
from .utils import tmp_popen


@dataclass(kw_only=True)
class Backend:
    port: str
    capture_file: Path


@contextmanager
def grasp_test_backend(*, capture_file: Path, port: str, template: str | None = None) -> Iterator[Backend]:
    cmdline = [
        sys.executable, '-m', 'grasp_backend',
        'serve',
        '--port', port,
        '--path', str(capture_file),
    ]  # fmt: skip
    if template is not None:
        cmdline.extend(['--template', template])
    logger = get_logger()
    logger.debug(f'running {cmdline}')
    with tmp_popen(cmdline) as _proc:
        # wait for startup
        for _attempts in range(100):
            try:
                # GET endpoint isn't implemented, but it's a good indication that server started up
                r = requests.get(f'http://localhost:{port}')
                if r.status_code == 501:
                    break
            except requests.ConnectionError:
                pass
            sleep(0.05)
        else:
            raise RuntimeError("grasp backend server didn't start up in time")

        yield Backend(
            port=port,
            capture_file=capture_file,
        )


def test_server(tmp_path: Path) -> None:
    cfile = tmp_path / 'test-capture.org'
    PORT = '17890'

    def send(url: str, title: str) -> None:
        r = requests.post(
            f'http://localhost:{PORT}',
            json={
                'url': url,
                'title': title,
                'selection': None,
                'comment': None,
                'tag_str': None,
            },
        )
        assert r.status_code == 200, r

    with grasp_test_backend(capture_file=cfile, port=PORT):
        send(url='twitter.com', title='Twitter')
        # this call is synchronous, so file should be written when it returns
        assert 'twitter.com' in cfile.read_text()
        # TODO er... wonder how nulls are converted into Nones..
        # assert 'null' not in cfile.read_text()
