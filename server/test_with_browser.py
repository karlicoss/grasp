#!/usr/bin env python3
from pathlib import Path
from time import sleep
from contextlib import contextmanager
from tempfile import TemporaryDirectory
import re
import json
import os

import pytest # type: ignore
from selenium import webdriver # type: ignore


from test_grasp import grasp_test_server


addon_path = (Path(__file__).parent.parent / 'dist').absolute()


def skip_if_ci(reason):
    return pytest.mark.skipif('CI' in os.environ, reason=reason)


@contextmanager
def get_webdriver():
    with TemporaryDirectory() as td:
        profile = webdriver.FirefoxProfile(td)
        # use firefox from here to test https://www.mozilla.org/en-GB/firefox/developer/
        driver = webdriver.Firefox(profile, firefox_binary='/L/soft/firefox-dev/firefox/firefox')
        try:
            driver.install_addon(str(addon_path), temporary=True)
            yield driver
        finally:
            driver.close()


def open_options_page(driver):
    # necessary to trigger prefs.js initialisation..
    driver.get('http://example.com')
    sleep(1)

    moz_profile = Path(driver.capabilities['moz:profile'])
    prefs_file = moz_profile / 'prefs.js'
    addon_id = None
    for line in prefs_file.read_text().splitlines():
        # temporary-addon\":\"53104c22-acd0-4d44-904c-22d11d31559a\"}")
        m = re.search(r'temporary-addon.....([0-9a-z-]+)."', line)
        if m is None:
            continue
        addon_id = m.group(1)
    assert addon_id is not None

    options = f'moz-extension://{addon_id}/options.html'
    driver.get(options)

# TODO could also check for errors

def change_port(driver, port: str):
    open_options_page(driver)

    ep = driver.find_element_by_id('endpoint_id')
    ep.clear()
    ep.send_keys(f'http://localhost:{port}')

    se = driver.find_element_by_id('save_id')
    se.click()

    driver.switch_to.alert.accept()


def trigger_grasp():
    # soo... triggering extension under automation turns out to be notoriously complicated

    # I tried webdriver.ActionChains, they work e.g. with TAB keys, but don't seem to trigger the extension

    # this https://www.blazemeter.com/blog/6-easy-steps-testing-your-chrome-extension-selenium/ is interesting, but isn't applicabe to my extension
    # might be a good way of messing with settings though

    # so the only remaining choice seems to be GUI interaction as described here https://stackoverflow.com/a/56452597/706389

    # TODO force focusing window?

    # err. that didn't work...
    # pyautogui.locateOnScreen('/L/soft/browser-extensions/grasp/unicorn.png')

    print("sending hotkey!")
    import pyautogui # type: ignore
    pyautogui.hotkey('ctrl', 'alt', 'c')


def confirm(what: str):
    # pylint: disable=import-error
    import click # type: ignore
    click.confirm(what, abort=True)


@skip_if_ci('no GUI to run the browser..')
def test(tmp_path: Path):
    capture_file = tmp_path / 'output.org'
    port = '17890'
    template = '* [[%:link][%:description]]'

    with grasp_test_server(capture_file=capture_file, template=template, port=port), get_webdriver() as driver:
        change_port(driver, port=port)

        driver.get('https://en.wikipedia.org/wiki/Automation')

        sleep(2) # just in case..
        # TODO select something?
        trigger_grasp()
        confirm('ready to continue?')

    sleep(1) # just in case

    # TODO come up with a better test and involve other template parameters
    assert capture_file.read_text() == '* [[https://en.wikipedia.org/wiki/Automation][Automation - Wikipedia]]'


def main():
    with TemporaryDirectory() as tdir:
        test(Path(tdir))


if __name__ == '__main__':
    main()
