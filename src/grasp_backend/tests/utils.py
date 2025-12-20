from collections.abc import Iterator
from contextlib import contextmanager

import psutil


@contextmanager
def tmp_popen(*args, **kwargs) -> Iterator[psutil.Popen]:
    with psutil.Popen(*args, **kwargs) as p:
        try:
            yield p
        finally:
            for c in p.children(recursive=True):
                c.kill()
            p.kill()
            p.wait()
