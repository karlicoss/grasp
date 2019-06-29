from contextlib import contextmanager
from pathlib import Path
from subprocess import Popen, check_call
from time import sleep


# ugh.
@contextmanager
def killmepls(*args, **kwargs):
    with Popen(*args, **kwargs) as p:
        try:
            yield p
        finally:
            p.kill()


def grasp_test_server(capture_file: Path, port: str, template=None):
    server = str((Path(__file__).parent / 'grasp_server.py').absolute())
    cmdline = [
        server, '--port', port, '--path', str(capture_file),
    ]
    if template is not None:
        cmdline.extend(['--template', template])
    return killmepls(cmdline)


def test_server(tmp_path: Path):
    cfile = tmp_path / 'test-capture.org'
    PORT = '17777'

    def send(url: str, title: str):
        # TODO eh, not sure if there is anything easier than httpie
        check_call([
            'http', '--ignore-stdin', 'POST', f'http://localhost:{PORT}',
            f'url={url}',
            f'title={title}',
            'selection=null',
            'comment=null',
            'tag_str=null',
        ])


    with grasp_test_server(capture_file=cfile, port=PORT):
        sleep(0.5) # startup

        send(url='twitter.com', title='Twitter')
        sleep(0.5)

        assert 'twitter.com' in cfile.read_text()
        # TODO er... wonder how nulls are converted into Nones..
        # assert 'null' not in cfile.read_text()

