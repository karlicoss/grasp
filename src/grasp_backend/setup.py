from __future__ import annotations

import argparse
import os
import platform
import shlex
import sys
from pathlib import Path
from subprocess import DEVNULL, check_call, run

SYSTEM = platform.system()

DEFAULT_UNIT_NAME = 'grasp' if SYSTEM == 'Linux' else 'com.github.karlicoss.grasp'

SYSTEMD_TEMPLATE = """
[Unit]
Description=Grasp extension server conterpart

[Install]
WantedBy=default.target

[Service]
ExecStart={arguments}
Type=simple
Restart=always
""".lstrip()


LAUNCHD_TEMPLATE = '''
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{service_name}</string>

    <key>ProgramArguments</key>
    <array>
{arguments}
    </array>

    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
'''.lstrip()


def systemd(*args, method=check_call):
    method(['systemctl', '--user', *args])


def get_command(args) -> list[str]:
    # fmt: off
    return [
        sys.executable, '-m', 'grasp_backend',
        'serve',
        '--port', args.port,
        '--path', args.path,
        '--template', args.template,
        *([] if args.config is None else ['--config'  , args.config]),
    ]
    # fmt: on


def setup_systemd(args) -> None:
    args.template = args.template.replace('%', '%%').replace('\n', r'\n')  # escape for systemd...
    args.unit_name = args.unit_name.removesuffix('.service')  # legacy unit_name default had .service

    base_path = '~/.config/systemd/user'
    if not Path(base_path).expanduser().is_dir():
        Path(base_path).expanduser().mkdir(parents=True, exist_ok=True)

    unit_name = args.unit_name
    out = Path(f'{base_path}/{unit_name}.service').expanduser()
    print(f"Writing unit file to {out}")

    command = get_command(args)
    arguments = ' '.join(map(shlex.quote, command))

    out.write_text(SYSTEMD_TEMPLATE.format(arguments=arguments))
    try:
        systemd('stop', unit_name, method=run)  # ignore errors here if it wasn't running in the first place
        systemd('daemon-reload')
        systemd('enable', unit_name)
        systemd('start', unit_name)
        systemd('status', unit_name)
    except Exception as e:
        print(f"Something has gone wrong... you might want to use 'journalctl --user -u {unit_name}' to debug")
        raise e


def setup_launchd(args) -> None:
    # launchd keep everything as xml and treats whitespace literally
    args.template = args.template.replace(r'\n', '\n')

    base_path = Path('~/Library/LaunchAgents')

    unit_name = args.unit_name
    out = Path(f'{base_path}/{unit_name}.plist').expanduser()
    print(f"Writing unit file to {out}")

    command = get_command(args)
    arguments = '\n'.join(f'<string>{a}</string>' for a in command)

    out.write_text(
        LAUNCHD_TEMPLATE.format(
            service_name=unit_name,
            arguments=arguments,
        )
    )

    DOMAIN = f'gui/{os.getuid()}'
    # defensive since might not have been running
    run(['launchctl', 'bootout', DOMAIN + '/' + unit_name], stdout=DEVNULL, stderr=DEVNULL, check=False)
    check_call(['launchctl', 'bootstrap', DOMAIN, out])


def setup_parser(p: argparse.ArgumentParser) -> None:
    from . import __main__

    p.add_argument('--unit-name', type=str, default=DEFAULT_UNIT_NAME, help='systemd/launchd unit name')
    __main__.setup_parser(p)


def setup(args: argparse.Namespace) -> None:
    if SYSTEM == 'Linux':
        setup_systemd(args)
    else:  # assume macos
        setup_launchd(args)
