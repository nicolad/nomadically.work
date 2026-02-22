"""Mock Cloudflare Workers runtime modules so db.py can be imported in pytest.

db.py itself only imports stdlib (json), so no CF mocks are strictly needed.
This conftest exists to add src/ to sys.path and serve as a hook if other
modules that do import from 'js'/'workers' are tested here in future.
"""

import os
import sys

# Make `from db import ...` work regardless of where pytest is invoked from.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../src"))
