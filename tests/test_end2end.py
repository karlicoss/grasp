from __future__ import annotations

import re
import socket
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from selenium.webdriver import Remote as Driver

from grasp_backend.tests.test_backend import Backend, grasp_test_backend

from .addon import (
    Addon,
    addon,  # noqa: F401 used as fixture
    addon_source,  # noqa: F401 used as fixture, imported here to avoid circular import between webdirver utils and addon.py
)
from .utils import parametrize_named
from .webdriver_utils import (
    Browser,
    Manual,
    browsers,
    driver,  # noqa: F401 used as fixture
)

# you can use mode='headless' to always auto-confirm even with gui tests
manual = Manual(mode='auto')
confirm = manual.confirm
#


@pytest.fixture
def backend(tmp_path: Path, grasp_port: str) -> Iterator[Backend]:
    capture_file = tmp_path / 'capture.org'
    with grasp_test_backend(
        capture_file=capture_file,
        port=grasp_port,
    ) as backend:
        yield backend


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
    # NOTE: in headless mode, we might shut down too quickly before the capture is sent


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
def test_capture_custom_endpoint(*, addon: Addon, driver: Driver, backend: Backend, browser: Browser) -> None:
    addon.options_page.open()
    # hack to make chrome think we changed the endpoint
    # (it'll be actual host name instead of localhost)
    hostname = socket.gethostname()

    # NOTE: seems like in some browsers (firefox?) this may not request permissions
    #  due to broad permissions given by content scripts
    # See comment about that in generate_manifest.js
    wait_for_permissions = not (browser.name == 'firefox' and addon.helper.has_selenium_bridge)
    if wait_for_permissions and browser.headless:
        pytest.skip("This test requires GUI to confirm permission prompts")
    addon.options_page.change_endpoint(
        endpoint=f'http://{hostname}:{backend.port}/capture',
        wait_for_permissions=wait_for_permissions,
    )

    driver.get('https://example.com')

    assert not backend.capture_file.exists()  # just in case

    addon.quick_capture()
    time.sleep(1)  # just to give it time to actually capture

    assert 'https://example.com' in backend.capture_file.read_text()


@browsers()
@parametrize_named("grasp_port", ["17890"])
def test_capture_with_extra_data(*, addon: Addon, driver: Driver, backend: Backend, browser: Browser) -> None:
    addon.options_page.open()
    addon.options_page.change_endpoint(endpoint=f'http://localhost:{backend.port}/capture', wait_for_permissions=False)

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

    assert not backend.capture_file.exists()  # just in case

    popup = addon.popup
    popup.open()

    if browser.headless:
        pytest.skip("This test requires GUI to interact with a popup")

    popup.enter_data(comment='some multiline\nnote', tags='tag2 tag1')
    time.sleep(0.5)  # ugh sometimes resulted in failed test otherwise, at least in firefox
    popup.submit()
    time.sleep(1)  # just to give it time to actually capture

    captured = backend.capture_file.read_text()
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
