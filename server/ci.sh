#!/bin/bash
set -eux
# TODO add to proper ci pipeline
pylint -E *.py setup

mypy --check-untyped-defs *.py setup

pytest -s org_tools.py
