from __future__ import annotations

import re
import socket
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import click
import psutil
import pytest
from loguru import logger
from selenium.webdriver import Remote as Driver

from .addon import (
    Addon,
    addon,  # noqa: F401 used as fixture
    get_addon_source,
)
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
# firefox v3 works (although a little more elaborate due to additional approvals)
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

    if addon.helper.driver.name == 'firefox' and addon.helper.manifest_version == 3:
        # Seems like if v3 firefox, localhost permissions aren't granted by default
        # (despite being declared in host_permissions manifest)
        # so the above will result in error + opening options page so the user can approve
        time.sleep(0.5)  # meh. give the options page time to open
        [orig_page, options_page] = driver.window_handles
        driver.switch_to.window(options_page)  # meh. is there a better way??
        addon.options_page.save(wait_for_permissions=True)
        driver.close()  # close settings
        driver.switch_to.window(orig_page)  # meh. is there a better way??

        addon.quick_capture()  # retry capture

    confirm('Should show a successful capture notification, and the link should be in your default capture file')


# chrome  v3 works
# firefox v2 works
# firefox v3 works
def test_capture_bad_port(addon: Addon) -> None:
    """
    Check that we get error notification instead of silently failing if the endpoint is wrong
    """
    driver = addon.helper.driver

    addon.options_page.open()

    # seems like manifest v3 in firefox is prompting for permission even if we only change port
    wait_for_permissions = addon.helper.driver.name == 'firefox' and addon.helper.manifest_version == 3
    addon.options_page.change_endpoint(
        endpoint='http://localhost:12345/capture', wait_for_permissions=wait_for_permissions
    )

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
    # FIXME 20251219 seems like it doesn't ask for permissions in firefox anymore?
    # even if hostname is something completely random? odd
    # ugh, v2 manifest in firefox and v3 chrome do ask; whereas v3 in firefox doesn't??
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
    time.sleep(0.5)  # ugh sometimes resulted in failed test otherwise, at least in firefox
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
    confirm("Popup should be closed after a few seconds")
