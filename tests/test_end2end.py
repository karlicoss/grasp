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
from selenium import webdriver

from .addon_helper import AddonHelper, focus_browser_window
from . import paths  # type: ignore[attr-defined]


@dataclass
class OptionsPage:
    # I suppose it's inevitable it's at least somewhat driver aware? since we want it to locate elements etc
    helper: AddonHelper

    def open(self) -> None:
        # TODO extract from manifest -> options_id -> options.html
        # seems like addon just links to the actual manifest on filesystem, so will need to read from that
        page_name = 'options.html'
        self.helper.open_page(page_name)

    def change_endpoint(self, endpoint: str, *, wait_for_permissions: bool = False) -> None:
        driver = self.helper.driver

        current_url = driver.current_url
        assert current_url.endswith('options.html'), current_url  #  just in case

        ep = driver.find_element('id', 'endpoint_id')
        while ep.get_attribute('value') == '':
            # data is set asynchronously, so need to wait for data to appear
            # TODO is there some webdriver wait?
            time.sleep(0.001)
        ep.clear()
        ep.send_keys(endpoint)

        se = driver.find_element('id', 'save_id')
        se.click()

        if wait_for_permissions:
            # we can't accept this alert via webdriver, it's a native chrome alert, not DOM
            confirm('You should see prompt for permissions. Accept them')

        alert = driver.switch_to.alert
        assert alert.text == 'Saved!', alert.text  # just in case
        alert.accept()


@dataclass
class Popup:
    helper: AddonHelper

    def open(self) -> None:
        # I suppose triggeing via hotkey is bound to be cursed?
        # maybe replace with selenium_bridge thing... or ydotool?
        # although to type into in, I'll need pyautogui anyway...
        import pyautogui

        modifier = {'firefox': 'alt', 'chrome': 'shift'}[self.helper.driver.name]

        focus_browser_window(self.helper.driver)

        pyautogui.hotkey('ctrl', modifier, 'y')
        time.sleep(2)  # TODO not sure if can do better?

    def enter_data(self, *, comment: str, tags: str) -> None:
        import pyautogui

        if self.helper.driver.name == 'firefox':
            # for some reason in firefox under geckodriver it woudn't focus comment input field??
            # tried both regular and dev edition firefox with latest geckodriver
            # works fine when extension is loaded in firefox manually or in chrome with chromedriver..
            # TODO file a bug??
            pyautogui.hotkey('tab')  # give focus to the input

        pyautogui.write(comment)

        pyautogui.hotkey('tab')  # switch to tags

        # erase default, without interval doesn't remove everything
        for _ in range(10):
            pyautogui.hotkey('backspace')
        # pyautogui.hotkey(['backspace' for i in range(10)], interval=0.05)
        pyautogui.write(tags)

    def submit(self) -> None:
        import pyautogui

        pyautogui.hotkey('shift', 'enter')


@dataclass
class Addon:
    helper: AddonHelper

    def quick_capture(self) -> None:
        import pyautogui

        modifier = {'firefox': 'alt', 'chrome': 'shift'}[self.helper.driver.name]

        focus_browser_window(self.helper.driver)

        pyautogui.hotkey('ctrl', modifier, 'h')

    @property
    def options_page(self) -> OptionsPage:
        return OptionsPage(helper=self.helper)

    @property
    def popup(self) -> Popup:
        return Popup(helper=self.helper)


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


# TODO move to addon_helper?? not sure
@pytest.fixture
def addon(tmp_path: Path, browser: str) -> Iterator[Addon]:
    addon_path = Path('extension/dist').absolute() / browser
    assert (addon_path / 'manifest.json').exists()

    driver: webdriver.Remote
    # FIXME headless (there is some code in promnesia)
    if browser == 'firefox':
        ff_options = webdriver.FirefoxOptions()
        # NOTE: using dev edition firefox
        ff_options.binary_location = paths.firefox

        # TODO not sure what's the difference with install_addon?
        # seems like this one is depecated
        # https://github.com/SeleniumHQ/selenium/blob/ba27d0f7675a3d8139544e5522b8f0690a2ba4ce/py/selenium/webdriver/firefox/firefox_profile.py#L82
        # ff_profile = webdriver.FirefoxProfile()
        # ff_profile.add_extension(str(addon_path))
        # ff_options.profile = ff_profile

        # WTF?? it's autodownloaded by selenium???
        # .local/lib/python3.10/site-packages/selenium/webdriver/common/selenium_manager.py
        # service = webdriver.FirefoxService(executable_path=paths.geckodriver)

        # todo use tmp_path for profile path?
        driver = webdriver.Firefox(options=ff_options)
    elif browser == 'chrome':
        # todo name it chromium?
        # NOTE: something like this https://storage.googleapis.com/chrome-for-testing-public/123.0.6312.122/linux64/chrome-linux64.zip
        cr_options = webdriver.ChromeOptions()
        # shit. ok, this seems to work...
        cr_options.binary_location = paths.chrome
        cr_options.add_argument('--load-extension=' + str(addon_path))
        cr_options.add_argument('--user-data-dir=' + str(tmp_path))
        # NOTE: there is also .add_extension, but it seems to require a packed extension (zip or crx?)

        service = webdriver.ChromeService(executable_path=paths.chromedriver)
        driver = webdriver.Chrome(service=service, options=cr_options)
    else:
        raise RuntimeError(browser)

    with driver:
        if browser == 'firefox':
            # todo log driver.capabilities['moz:geckodriverVersion'] and 'browserVersion'
            # TODO doesn't work with regular Firefox? says addon must be signed
            # FIXME crap, it seems that the addon is installed as an xpi from a temporary location?
            # so if we modify code we have to rerun the test
            assert isinstance(driver, webdriver.Firefox), driver
            driver.install_addon(str(addon_path), temporary=True)
        elif browser == 'chrome':
            pass
        else:
            raise RuntimeError(browser)

        helper = AddonHelper(driver=driver)
        yield Addon(helper=helper)


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

    assert captured == '''\
* [date] Example Domain :tag2:tag1:
https://example.com/
Selection:
le Doma
Comment:
some multiline
note
'''
