from __future__ import annotations

import os
import re
import socket
import sys
import time
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import click
import pytest
from loguru import logger
from selenium.webdriver import Remote as Driver

from .addon import (
    Addon,
    addon,  # noqa: F401 used as fixture
    addon_source,  # noqa: F401 used as fixture, imported here to avoid circular import between webdirver utils and addon.py
)
from .utils import has_x, parametrize_named, tmp_popen
from .webdriver_utils import (
    Browser,
    driver,  # noqa: F401 used as fixture
)


@dataclass
class Server:
    port: str
    capture_file: Path


@pytest.fixture
def server(tmp_path: Path, grasp_port: str) -> Iterator[Server]:
    capture_file = tmp_path / 'capture.org'

    cmdline = [sys.executable, '-m', 'grasp_backend', 'serve', '--port', grasp_port, '--path', capture_file]
    logger.debug(f'running {cmdline}')
    with tmp_popen(cmdline):
        # todo wait till it's ready?
        yield Server(port=grasp_port, capture_file=capture_file)


def confirm(what: str) -> None:
    is_headless = 'headless' in os.environ.get('PYTEST_CURRENT_TEST', '')
    if is_headless:
        # ugh.hacky
        logger.warning(f'"{what}": headless mode, responding "yes"')
        return
    click.confirm(click.style(what, blink=True, fg='yellow'), abort=True)


def browsers(*br: Browser):
    if len(br) == 0:
        # if no args passed, test all combinations
        br = (
            Browser(name='chrome' , headless=False),
            Browser(name='firefox', headless=False),
            Browser(name='chrome' , headless=True),
            Browser(name='firefox', headless=True),
        )  # fmt: skip
    if not has_x():
        # this is convenient to filter out automatically for CI
        br = tuple(b for b in br if b.headless)
    return pytest.mark.parametrize(
        "browser",
        br,
        ids=[f'browser={b.name}_{"headless" if b.headless else "gui"}' for b in br],
    )


@browsers()
def test_capture_no_configuration(*, addon: Addon, driver: Driver) -> None:
    """
    This checks that capture works with default hostname/port without opening settings first
    """
    # it's kinda tricky -- grasp on my system is already running on default 12212 port
    # so if it's already running, not sure what to do since we'll have to somehow detect it and extract data from it
    # (probably a bad idea to try to access it from the test either)
    driver.get('https://example.com')

    addon.quick_capture()

    # 20251220 ok seems like not necessary anymore? maybe after solving permission mess
    # keeping this code for now just for the reference
    # if addon.helper.driver.name == 'firefox' and addon.helper.manifest_version == 3:
    #     # Seems like if v3 firefox, localhost permissions aren't granted by default
    #     # (despite being declared in host_permissions manifest)
    #     # so the above will result in error + opening options page so the user can approve
    #     time.sleep(0.5)  # meh. give the options page time to open
    #     [orig_page, options_page] = driver.window_handles
    #     driver.switch_to.window(options_page)  # meh. is there a better way??
    #     addon.options_page.save(wait_for_permissions=True)
    #     driver.close()  # close settings
    #     driver.switch_to.window(orig_page)  # meh. is there a better way??

    #     addon.quick_capture()  # retry capture

    confirm('Should show a successful capture notification, and the link should be in your default capture file')


@browsers()
def test_capture_bad_port(*, addon: Addon, driver: Driver) -> None:
    """
    Check that we get error notification instead of silently failing if the endpoint is wrong
    """
    addon.options_page.open()

    addon.options_page.change_endpoint(endpoint='http://localhost:12345/capture', wait_for_permissions=False)

    driver.get('https://example.com')

    addon.quick_capture()

    confirm("Should show a notification with error that the endpoint isn't available")


@browsers()
@parametrize_named("grasp_port", ["17890"])
def test_capture_custom_endpoint(*, addon: Addon, driver: Driver, server: Server, browser: Browser) -> None:
    addon.options_page.open()
    # hack to make chrome think we changed the endpoint
    # (it'll be actual host name instead of localhost)
    hostname = socket.gethostname()

    if browser.headless:
        pytest.skip("This test requires GUI to confirm permission prompts")

    # FIXME 20251220 seems like in some browsers (firefox?) this may not request permissions
    # due to broad permissions given by content script to detect dark mode and set icon accordingly.
    # See comment about detect_dark_mode.js in generate_manifest.js
    addon.options_page.change_endpoint(
        endpoint=f'http://{hostname}:{server.port}/capture',
        wait_for_permissions=True,
    )

    driver.get('https://example.com')

    assert not server.capture_file.exists()  # just in case

    addon.quick_capture()
    time.sleep(1)  # just to give it time to actually capture

    assert 'https://example.com' in server.capture_file.read_text()


@browsers()
@parametrize_named("grasp_port", ["17890"])
def test_capture_with_extra_data(*, addon: Addon, driver: Driver, server: Server, browser: Browser) -> None:
    addon.options_page.open()
    addon.options_page.change_endpoint(endpoint=f'http://localhost:{server.port}/capture', wait_for_permissions=False)

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

    if browser.headless:
        pytest.skip("This test requires GUI to confirm permission prompts")

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
