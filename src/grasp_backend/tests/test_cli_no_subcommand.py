import subprocess
import sys


def test_no_subcommand_exits_with_usage_error() -> None:
    # Running the CLI without a subcommand should fail like a normal
    # argparse error (usage on stderr, exit code 2), not dump a traceback.
    proc = subprocess.run(
        [sys.executable, '-m', 'grasp_backend'],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode == 2, proc.stderr
    assert 'Traceback' not in proc.stderr
    assert 'RuntimeError' not in proc.stderr
