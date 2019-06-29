#!/usr/bin env python3
from pathlib import Path
from time import sleep

from selenium import webdriver # type: ignore
import pyautogui # type: ignore


addon_path = (Path(__file__).parent.parent / 'build').absolute()


def get_webdriver():
    profile = webdriver.FirefoxProfile()
    driver = webdriver.Firefox(profile, firefox_binary='/L/soft/firefox-dev/firefox/firefox')
    driver.install_addon(str(addon_path), temporary=True)
    return driver

# TODO need to fix hotkey!


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
    driver = get_webdriver()
    driver.get('https://en.wikipedia.org/wiki/Automation')

    sleep(2) # just in case..
    # TODO select something?
    trigger_grasp()


def main():
    test()

if __name__ == '__main__':
    main()
