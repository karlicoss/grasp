#!/usr/bin env python3
from pathlib import Path
from time import sleep
from contextlib import contextmanager
from tempfile import TemporaryDirectory
import re
import json

from selenium import webdriver # type: ignore
import pyautogui # type: ignore


addon_path = (Path(__file__).parent.parent / 'build').absolute()


@contextmanager
def get_webdriver():
    with TemporaryDirectory() as td:
        profile = webdriver.FirefoxProfile(td)
        driver = webdriver.Firefox(profile, firefox_binary='/L/soft/firefox-dev/firefox/firefox')
        driver.install_addon(str(addon_path), temporary=True)

        yield driver
    # TODO close driver?


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
    pyautogui.hotkey('ctrl', 'alt', 'c')


def test():
    with get_webdriver() as driver:
        change_port(driver, port='17777')

        driver.get('https://en.wikipedia.org/wiki/Automation')

        sleep(2) # just in case..
        # TODO select something?
        trigger_grasp()


def main():
    test()

if __name__ == '__main__':
    main()
