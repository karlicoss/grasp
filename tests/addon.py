"""
Grasp-specific addon wrappers
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import time
from typing import Iterator

import click
import pytest
from selenium.webdriver import Remote as Driver

from .addon_helper import AddonHelper


def get_addon_source(kind: str) -> Path:
    # TODO compile first?
    addon_path = (Path(__file__).parent.parent / 'extension' / 'dist' / kind).absolute()
    assert addon_path.exists()
    assert (addon_path / 'manifest.json').exists()
    return addon_path


class Command:
    # TODO assert these against manifest?
    CAPTURE_SIMPLE = 'capture-simple'
    CAPTURE_EXTRA = '_execute_browser_action'
    CAPTURE_EXTRA_V3 = '_execute_action'


@dataclass
class OptionsPage:
    # I suppose it's inevitable it's at least somewhat driver aware? since we want it to locate elements etc
    helper: AddonHelper

    def open(self) -> None:
        self.helper.open_page(self.helper.options_page_name)

    def check_opened(self) -> None:
        current_url = self.helper.driver.current_url
        assert current_url.endswith(self.helper.options_page_name), current_url  #  just in case

    def save(self, *, wait_for_permissions: bool = False) -> None:
        self.check_opened()

        driver = self.helper.driver

        se = driver.find_element('id', 'save_id')
        se.click()

        if wait_for_permissions:
            # we can't accept this alert via webdriver, it's a native chrome alert, not DOM
            click.confirm(click.style('You should see prompt for permissions. Accept them', blink=True, fg='yellow'), abort=True)

        alert = driver.switch_to.alert
        assert alert.text == 'Saved!', alert.text  # just in case
        alert.accept()

    def change_endpoint(self, endpoint: str, *, wait_for_permissions: bool = False) -> None:
        self.check_opened()

        driver = self.helper.driver

        current_url = driver.current_url
        assert current_url.endswith(self.helper.options_page_name), current_url  #  just in case

        ep = driver.find_element('id', 'endpoint_id')
        while ep.get_attribute('value') == '':
            # data is set asynchronously, so need to wait for data to appear
            # TODO is there some webdriver wait?
            time.sleep(0.001)
        ep.clear()
        ep.send_keys(endpoint)

        self.save(wait_for_permissions=wait_for_permissions)


@dataclass
class Popup:
    addon: 'Addon'

    def open(self) -> None:
        self.addon.activate()

    def enter_data(self, *, comment: str, tags: str) -> None:
        helper = self.addon.helper

        if helper.driver.name == 'firefox':
            # for some reason in firefox under geckodriver it woudn't focus comment input field??
            # tried both regular and dev edition firefox with latest geckodriver
            # works fine when extension is loaded in firefox manually or in chrome with chromedriver..
            # TODO file a bug??
            helper.gui_hotkey('tab')  # give focus to the input

        helper.gui_write(comment)

        helper.gui_hotkey('tab')  # switch to tags

        # erase default, without interval doesn't remove everything
        for _ in range(10):
            helper.gui_hotkey('backspace')
        # pyautogui.hotkey(['backspace' for i in range(10)], interval=0.05)
        helper.gui_write(tags)

    def submit(self) -> None:
        self.addon.helper.gui_hotkey('shift+enter')


@dataclass
class Addon:
    helper: AddonHelper

    def activate(self) -> None:
        cmd = {
            2: Command.CAPTURE_EXTRA,
            3: Command.CAPTURE_EXTRA_V3,  # meh
        }[self.helper.manifest_version]
        self.helper.trigger_command(cmd)

    def quick_capture(self) -> None:
        self.helper.trigger_command(Command.CAPTURE_SIMPLE)

    @property
    def options_page(self) -> OptionsPage:
        return OptionsPage(helper=self.helper)

    @property
    def popup(self) -> Popup:
        return Popup(addon=self)


@pytest.fixture
def addon(driver: Driver) -> Iterator[Addon]:
    addon_source = get_addon_source(kind=driver.name)
    helper = AddonHelper(driver=driver, addon_source=addon_source)
    yield Addon(helper=helper)
