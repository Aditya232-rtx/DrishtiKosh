from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
import os

def download_whisper():
    model_id = "openai/whisper-small"
    output_dir = "backend/models_data/whisper-small"
    
    print(f"Downloading {model_id} to {output_dir}...")
    
    # Download model and processor
    model = AutoModelForSpeechSeq2Seq.from_pretrained(model_id)
    processor = AutoProcessor.from_pretrained(model_id)
    
    # Save locally
    model.save_pretrained(output_dir)
    processor.save_pretrained(output_dir)
    
    print("Download complete!")

if __name__ == "__main__":
    # Ensure directory exists
    os.makedirs("backend/models_data", exist_ok=True)
    download_whisper()
