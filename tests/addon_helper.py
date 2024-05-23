from dataclasses import dataclass
from functools import cached_property
import json
from pathlib import Path
import re
import subprocess
from typing import Any

from loguru import logger
import psutil
from selenium import webdriver

from .webdriver_utils import is_headless


@dataclass
class AddonHelper:
    driver: webdriver.Remote
    addon_source: Path

    @cached_property
    def addon_id(self) -> str:
        return get_addon_id(driver=self.driver)

    @cached_property
    def manifest(self) -> Any:
        # ugh. sadly (at least in Firefox) there doesn't seem a way to read actual manifest loaded in browser?
        return json.loads((self.addon_source / 'manifest.json').read_text())

    @cached_property
    def manifest_version(self) -> int:
        return self.manifest['manifest_version']

    @property
    def extension_prefix(self) -> str:
        protocol = {
            'chrome': 'chrome-extension',
            'firefox': 'moz-extension',
        }[self.driver.name]
        return f'{protocol}://{self.addon_id}'

    def open_page(self, path: str) -> None:
        self.driver.get(self.extension_prefix + '/' + path)

    @property
    def options_page_name(self) -> str:
        return self.manifest['options_ui']['page']

    @property
    def headless(self) -> bool:
        return is_headless(self.driver)

    def trigger_command(self, command: str) -> None:
        # note: also for chrome possible to extract from prefs['extensions']['commands'] if necessary
        commands = self.manifest['commands']
        assert command in commands, (command, commands)

        if self.headless:
            # see selenium_bridge.js
            ccc = f'selenium-bridge-{command}'
            self.driver.execute_script(
                f"""
            var event = document.createEvent('HTMLEvents');
            event.initEvent('{ccc}', true, true);
            document.dispatchEvent(event);
            """
            )
        else:
            hotkey = commands[command]['suggested_key']['default']
            self.gui_hotkey(hotkey)

    def gui_hotkey(self, key: str) -> None:
        assert not self.headless  # just in case
        lkey = key.lower().split('+')
        logger.debug(f'sending hotkey {lkey}')

        import pyautogui

        focus_browser_window(self.driver)
        pyautogui.hotkey(*lkey)

    def gui_write(self, *args, **kwargs) -> None:
        assert not self.headless

        import pyautogui

        focus_browser_window(self.driver)
        pyautogui.write(*args, **kwargs)  # select first item


# NOTE looks like it used to be posssible in webdriver api?
# at least as of 2011 https://github.com/gavinp/chromium/blob/681563ea0f892a051f4ef3d5e53438e0bb7d2261/chrome/test/webdriver/test/chromedriver.py#L35-L40
# but here https://github.com/SeleniumHQ/selenium/blob/master/cpp/webdriver-server/command_types.h there are no Extension commands
# also see driver.command_executor._commands
def _get_chrome_addon_id(driver: webdriver.Remote) -> str:
    """
    For a temporary addon extension id is autogenerated, so we need to extract it every time
    """
    user_data_dir = Path(driver.capabilities['chrome']['userDataDir'])
    prefs_file = user_data_dir / 'Default/Preferences'
    assert prefs_file.exists(), prefs_file

    # for some idiotic reason, after chrome launches, extension settings aren't immediately available
    # this can take up to 30 secons in this loop until they are populated
    while True:
        prefs = json.loads(prefs_file.read_text())
        extension_settings = prefs.get('extensions', {}).get('settings', None)
        if extension_settings is not None:
            # there are some other weird builtin extension as well
            # this seems like the easiest way to filter them out extracing by extension name or path
            [addon_id] = [k for k, v in extension_settings.items() if v['creation_flags'] != 1]
            return addon_id


def _get_firefox_addon_id(driver: webdriver.Remote) -> str:
    moz_profile = Path(driver.capabilities['moz:profile'])
    prefs_file = moz_profile / 'prefs.js'
    assert prefs_file.exists(), prefs_file

    while True:
        for line in prefs_file.read_text().splitlines():
            m = re.fullmatch(r'user_pref\("extensions.webextensions.uuids", "(.*)"\);', line)
            if m is None:
                continue
            # this contains a json with escaped quotes
            user_prefs_s = m.group(1).replace('\\', '')
            user_prefs = json.loads(user_prefs_s)
            addon_ids = [v for k, v in user_prefs.items() if 'mozilla.' not in k]
            if len(addon_ids) == 0:
                # for some stupid reason it doesn't appear immediately in the file
                continue
            [addon_id] = addon_ids
            return addon_id


def get_addon_id(driver: webdriver.Remote) -> str:
    extractor = {
        'firefox': _get_firefox_addon_id,
        'chrome': _get_chrome_addon_id,
    }[driver.name]
    return extractor(driver)


def get_window_id(driver: webdriver.Remote) -> str:
    if driver.name == 'firefox':
        pid = str(driver.capabilities['moz:processID'])
    elif driver.name == 'chrome':
        # ugh no pid in capabilities...
        driver_pid = driver.service.process.pid  # type: ignore[attr-defined]
        process = psutil.Process(driver_pid)
        [chrome_process] = process.children()
        cmdline = chrome_process.cmdline()
        assert '--enable-automation' in cmdline, cmdline
        pid = str(chrome_process.pid)
    else:
        raise RuntimeError(driver.name)
    return get_wid_by_pid(pid)


def get_wid_by_pid(pid: str) -> str:
    # https://askubuntu.com/a/385037/427470
    wids = subprocess.check_output(['xdotool', 'search', '--pid', pid]).decode('utf8').splitlines()
    wids = [w.strip() for w in wids if len(w.strip()) > 0]

    def has_wm_desktop(wid: str) -> bool:
        # TODO no idea why is that important. found out experimentally
        out = subprocess.check_output(['xprop', '-id', wid, '_NET_WM_DESKTOP']).decode('utf8')
        return 'not found' not in out

    [wid] = filter(has_wm_desktop, wids)
    return wid


def focus_browser_window(driver: webdriver.Remote) -> None:
    assert not is_headless(driver)  # just in case
    wid = get_window_id(driver)
    subprocess.check_call(['xdotool', 'windowactivate', '--sync', wid])
