# NOTE: without __init__.py/__init__.pyi, mypy behaves weird.
# see https://github.com/python/mypy/issues/8584 and the related discussions
# sometime it's kinda valuable to have namespace package and not have __init__.py though,

# TLDR: you're better off having dimmy pyi, or alternatively you can use 'mypy -p src' (but that's a bit dirty?)

# todo not sure how it behaves when installed?
