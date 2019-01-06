#!/bin/bash
set -eux
# TODO add to proper ci pipeline
pylint -E server.py setup

# TODO ugh mypy complains at hug's annotations
mypy --check-untyped-defs server.py setup
