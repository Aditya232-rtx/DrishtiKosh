# Audio Pipeline Test Script

## Usage

1. **Prepare a test audio file:**
   - Record audio using your browser/phone
   - Save it as `test_input.webm` or `test_input.wav` in the `backend/` directory
   - Or place any audio file with name: `test_audio.wav`, `test_audio.webm`

2. **Run the test:**
   ```bash
   cd backend
   source venv/bin/activate
   python test_audio_pipeline.py
   ```

3. **Check the results:**
   - Audio output will be saved in `backend/test_outputs/test_output_[timestamp].wav`
   - Report will be saved in `backend/test_outputs/test_report_[timestamp].txt`
   - Listen to the audio file to verify:
     - All words are spoken
     - Complete sentences
     - Natural pacing

## What it tests:

- ✅ STT (Speech-to-Text) - Transcribes your audio
- ✅ AI Response Generation - Gets AI response
- ✅ TTS (Text-to-Speech) - Generates audio output
- ✅ Audio Analysis - Checks duration, completeness
- ✅ Content Verification - Compares expected vs actual

## Expected Output:

The script will show:
- STT transcription results
- AI response text
- TTS generation details
- Audio file analysis
- Duration comparisons
- Warnings if content seems incomplete
