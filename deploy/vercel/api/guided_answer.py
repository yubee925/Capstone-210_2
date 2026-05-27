import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("guided-answer.py")
SPEC = importlib.util.spec_from_file_location("guided_answer_dash", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)

call_guided_answer = MODULE.call_guided_answer
