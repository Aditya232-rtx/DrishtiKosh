import json
import sys

try:
    with open('/Users/adityajadhav/Drishtii/DrishtiKosh/frontend/package-lock.json', 'r') as f:
        json.load(f)
    print("✅ package-lock.json is VALID")
except json.JSONDecodeError as e:
    print(f"❌ JSON Error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
