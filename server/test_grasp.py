from contextlib import contextmanager
from pathlib import Path
from subprocess import Popen, check_call
from time import sleep


import requests


@contextmanager
def grasp_test_server(capture_file: Path, port: str, template=None):
    server = str((Path(__file__).parent / 'grasp_server.py').absolute())
    cmdline = [
        server, '--port', port, '--path', str(capture_file),
    ]
    if template is not None:
        cmdline.extend(['--template', template])
    with Popen(cmdline) as p:
        try:
            yield p
        finally:
            p.kill()


def test_server(tmp_path: Path) -> None:
    cfile = tmp_path / 'test-capture.org'
    PORT = '17890'

    def send(url: str, title: str):
        r = requests.post(
            f'http://localhost:{PORT}',
            json = {
                'url': url,
                'title': title,
                'selection': None,
                'comment': None,
                'tag_str': None,
            },
        )
        assert r.status_code == 200, r


    with grasp_test_server(capture_file=cfile, port=PORT):
        sleep(0.5) # startup

        send(url='twitter.com', title='Twitter')
        sleep(0.5)

        assert 'twitter.com' in cfile.read_text()
        # TODO er... wonder how nulls are converted into Nones..
        # assert 'null' not in cfile.read_text()

