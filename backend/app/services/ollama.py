import asyncio
import requests
from app.core.config import settings


class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL

    def _generate_sync(self, prompt: str) -> str:
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "think": False,
            "options": {
                "num_predict": 700,
                "temperature": 0.2,
            },
        }
        resp = requests.post(url, json=payload, timeout=420)
        resp.raise_for_status()
        data = resp.json()
        response_text = (data.get("response") or "").strip()
        if not response_text:
            response_text = (data.get("thinking") or "").strip()
        return response_text

    async def generate_text(self, prompt: str, video_url: str = None, files: list = None) -> str:
        enriched_prompt = prompt

        if video_url:
            enriched_prompt += (
                "\n\n[Video Context]\n"
                f"Video URL: {video_url}\n"
                "Use this URL as reference context while answering."
            )

        if files:
            file_lines = []
            for file_info in files:
                uri = file_info.get("uri")
                mime_type = file_info.get("mime_type")
                if uri and mime_type:
                    file_lines.append(f"- {uri} ({mime_type})")
            if file_lines:
                enriched_prompt += "\n\n[Attached Files]\n" + "\n".join(file_lines)

        try:
            return await asyncio.to_thread(self._generate_sync, enriched_prompt)
        except Exception as e:
            return f"Error generating response from Ollama: {e}"


ollama_service = OllamaService()
