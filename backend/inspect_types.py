from google import genai
import google.genai.types as types

print("--- google.genai.types dir ---")
print([t for t in dir(types) if "Config" in t or "Voice" in t])

if hasattr(types, "LiveConnectConfig"):
    print("\n--- LiveConnectConfig ---")
    try:
        print(types.LiveConnectConfig.model_json_schema())
    except:
        print(dir(types.LiveConnectConfig))

if hasattr(types, "SpeechConfig"):
    print("\n--- SpeechConfig ---")
    try:
        print(types.SpeechConfig.model_json_schema())
    except:
        print(dir(types.SpeechConfig))
