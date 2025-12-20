import os
from contextlib import contextmanager

import psutil
import pytest


@contextmanager
def tmp_popen(*args, **kwargs):
    with psutil.Popen(*args, **kwargs) as p:
        try:
            yield p
        finally:
            for c in p.children(recursive=True):
                c.kill()
            p.kill()
            p.wait()


def parametrize_named(param: str, values):
    """
    by default pytest isn't showing param names in the test name which is annoying
    """
    return pytest.mark.parametrize(param, values, ids=[f'{param}={v}' for v in values])


def has_x() -> bool:
    return 'DISPLAY' in os.environ
