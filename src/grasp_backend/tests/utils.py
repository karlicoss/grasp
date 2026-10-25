from collections.abc import Generator
from contextlib import contextmanager

import psutil


@contextmanager
def tmp_popen(*args, **kwargs) -> Generator[psutil.Popen, None, None]:
    with psutil.Popen(*args, **kwargs) as p:
        try:
            yield p
        finally:
            for c in p.children(recursive=True):
                c.kill()
            p.kill()
            p.wait()
