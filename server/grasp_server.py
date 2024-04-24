#!/usr/bin/env python3
import warnings
warnings.warn("This way of running grasp is deprecated! Please refer to readme and install it as a pip package")

from pathlib import Path

SRC_DIR = Path(__file__).absolute().parent.parent / 'src'
assert SRC_DIR.exists(), SRC_DIR

import os
import sys
os.chdir(SRC_DIR)
os.execvp(
    sys.executable,
    [sys.executable, '-m', 'grasp_backend', 'serve', *sys.argv[1:]]
)
