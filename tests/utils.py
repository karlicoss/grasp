import os

import pytest


def parametrize_named(param: str, values):
    """
    by default pytest isn't showing param names in the test name which is annoying
    """
    return pytest.mark.parametrize(param, values, ids=[f'{param}={v}' for v in values])


def has_x() -> bool:
    return 'DISPLAY' in os.environ
