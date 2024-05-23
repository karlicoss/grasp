#!/usr/bin/env python3
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
import re
import socket
import sys
import time
from typing import Iterator

import click
from loguru import logger
import psutil
import pytest
from selenium.webdriver import Remote as Driver

from .addon import addon, get_addon_source, Addon
from .webdriver_utils import get_webdriver


@pytest.fixture
def driver(tmp_path: Path, browser: str) -> Iterator[Driver]:
    profile_dir = tmp_path / 'browser_profile'
    res = get_webdriver(
        profile_dir=profile_dir,
        addon_source=get_addon_source(kind=browser),
        browser=browser,
        headless=False,  # TODO?
        logger=logger,
    )
    try:
        yield res
    finally:
        res.quit()


@dataclass
class Server:
    port: str
    capture_file: Path


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


@pytest.fixture
def server(tmp_path: Path, grasp_port: str) -> Iterator[Server]:
    capture_file = tmp_path / 'capture.org'

    server_bin = Path(__file__).absolute().parent.parent / 'server/grasp_server.py'
    assert server_bin.exists(), server_bin

    cmdline = [sys.executable, server_bin, '--port', grasp_port, '--path', capture_file]
    logger.debug(f'running {cmdline}')
    with tmp_popen(cmdline):
        # todo wait till it's ready?
        yield Server(port=grasp_port, capture_file=capture_file)


# TODO adapt for multiple params
def myparametrize(param: str, values):
    """
    by default pytest isn't showing param names in the test name which is annoying
    """
    return pytest.mark.parametrize(param, values, ids=[f'{param}={v}' for v in values])


def confirm(what: str) -> None:
    click.confirm(click.style(what, blink=True, fg='yellow'), abort=True)


# chrome  v3 works
# firefox v2 works
# firefox v3 BROKEN -- needs the user to approve the localhost access
def test_capture_no_configuration(addon: Addon) -> None:
    """
    This checks that capture works with default hostname/port without opening settings first
    """
    # it's kinda tricky -- grasp on my system is already running on default 12212 port
    # so if it's already running, not sure what to do since we'll have to somehow detect it and extract data from it
    # (probably a bad idea to try to access it from the test either)

    # todo can we just request Driver object directly?
    driver = addon.helper.driver

    driver.get('https://example.com')

    addon.quick_capture()

    confirm('Should show a successful capture notification, and the link should be in your default capture file')


# chrome  v3 works
# firefox v2 works
# firefox v3 BROKEN (sort of)
#            seems like manifest v3 is prompting for permission even if we only change port
def test_capture_bad_port(addon: Addon) -> None:
    """
    Check that we get error notification instead of silently failing if the endpoint is wrong
    """
    driver = addon.helper.driver

    addon.options_page.open()
    addon.options_page.change_endpoint(endpoint='http://localhost:12345/capture')

    driver.get('https://example.com')

    addon.quick_capture()

    confirm("Should show a notification with error that the endpoint isn't available")


# chrome  v3 works
# firefox v2 works
# firefox v3 works
@myparametrize("grasp_port", ["17890"])
def test_capture_custom_endpoint(addon: Addon, server: Server) -> None:
    driver = addon.helper.driver

    addon.options_page.open()
    # hack to make chrome think we changed the endpoint
    # (it'll be actual host name instead of localhost)
    hostname = socket.gethostname()
    addon.options_page.change_endpoint(
        endpoint=f'http://{hostname}:{server.port}/capture',
        wait_for_permissions=True,
    )

    driver.get('https://example.com')

    assert not server.capture_file.exists()  # just in case

    addon.quick_capture()
    time.sleep(1)  # just to give it time to actually capture

    assert 'https://example.com' in server.capture_file.read_text()


# chrome  v3 works
# firefox v2 works
# firefox v3 works
@myparametrize("grasp_port", ["17890"])
def test_capture_with_extra_data(addon: Addon, server: Server) -> None:
    driver = addon.helper.driver

    addon.options_page.open()
    addon.options_page.change_endpoint(
        endpoint=f'http://localhost:{server.port}/capture',
        # NOTE ugh ffs. chrome doesn't ask for permission here.
        # firefox does, but only in v3???  TODO make conditional on manifest version..
        wait_for_permissions=(driver.name == 'firefox'),
    )

    driver.get('https://example.com')

    ## select some text (fuck my life)
    driver.execute_script(
        '''
    var h1 = document.querySelector('h1')
    var node = h1.firstChild
    var range = document.createRange()
    range.setStart(node, 5)
    range.setEnd(node, 5 + 7)

    var sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    '''
    )
    ##

    assert not server.capture_file.exists()  # just in case

    popup = addon.popup
    popup.open()
    popup.enter_data(comment='some multiline\nnote', tags='tag2 tag1')
    popup.submit()

    captured = server.capture_file.read_text()
    captured = re.sub(r'\[.*?\]', '[date]', captured)  # dates are volatile, can't test against them

    assert (
        captured
        == '''\
* [date] Example Domain :tag2:tag1:
https://example.com/
Selection:
le Doma
Comment:
some multiline
note
'''
    )
