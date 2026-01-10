# STT Deep Evaluation Report

Evaluation of Whisper Model on 5-6 sentence audio samples generated via Google Cloud TTS.

| Language | Code | Lang Match? | Sim Score | Detected Code | Expected | Detected Text |
|---|---|---|---|---|---|---|
| Hindi | hi | ✅ | 0.52 | hi | hi | नमस्ते, बारतिक विशाल वर सुंदर देश है, यहां के लोग ... |
| English | en | ✅ | 0.60 | en | en | Hello, India is a vast and beautiful country. The ... |
| Marathi | mr | ✅ | 0.36 | mr | mr | नमसका, बारत हा एक विशाल अनी, देशा है, ये थिल लोग क... |
| Bengali | bn | ✅ | 0.00 | bn | bn | Namaskar. Bharat ek ti Bisha le bang Sundar Desh. ... |
| Gujarati | gu | ✅ | 0.02 | gu | gu | नमस्ते, बारतिक विशार ह, |
| Tamil | ta | ✅ | 0.14 | ta | ta | வணக்கம், இந்தியா ஒரு பரநத |
| Telugu | te | ✅ | 0.00 | te | te | Namaskaram |
| Kannada | kn | ✅ | 0.00 | kn | kn | नमसकार, |
| Malayalam | ml | ✅ | 0.00 | ml | ml | Namaskaram! |
| Punjabi | pa | ✅ | 0.03 | pa | pa | Sat Sri Akal, Bharat ek |
| Assamese | as | ❌ | 0.00 | bn | as | Namaskar. |
| Odia | or | ❌ | 0.01 | ne | or | नामसकर, � |

## Analysis
- **Scores**: 0.0 to 1.0 (1.0 is perfect match).
- **Lang Match**: Whether the detected language code matches exactly.
