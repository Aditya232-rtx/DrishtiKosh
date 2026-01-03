from memori import Memori
import inspect
try:
    print(inspect.signature(Memori.__init__))
except Exception as e:
    print(f"Error inspecting Memori: {e}")
