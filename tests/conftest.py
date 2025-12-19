import pytest


def pytest_addoption(parser) -> None:
    parser.addoption(
        '--browser',
        choices=['firefox', 'chrome'],
        default='firefox',  # FIXME add --all or something
    )


@pytest.fixture
def browser(request) -> str:
    return request.config.getoption("--browser")
