# DrishtiKosh 🌐

**An intelligent, multilingual AI assistant platform designed for visually impaired users in India.**

DrishtiKosh ("Vision Repository" in Hindi) combines advanced speech recognition, AI-powered responses, and natural-sounding text-to-speech to create an accessible, voice-first interface supporting 12 Indian languages.

---

## ✨ Features

### 🎤 Voice-First Interface
- **Speech-to-Text (STT)**: Powered by OpenAI Whisper for accurate multilingual transcription
- **Text-to-Speech (TTS)**: Google Cloud TTS with native Indian accents and voices
- Real-time audio processing with <1s latency

### 🌍 Multilingual Support
Supports **12 Indian languages** with automatic language detection:
- Hindi (हिंदी)
- English
- Bengali (বাংলা)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)
- Marathi (मराठी)
- Gujarati (ગુજરાતી)
- Punjabi (ਪੰਜਾਬੀ)
- Assamese (অসমীয়া)
- Odia (ଓଡ଼ିଆ)

### 🤖 AI-Powered Assistance
- **Conversational AI**: Powered by Google Gemini 2.0 Flash Exp via Vertex AI
- **Image Understanding**: Describe images and visual content for blind users
- **Context-Aware**: Maintains conversation history and adapts responses
- **Smart Language Matching**: Automatically responds in the user's detected language

### 📝 Additional Features
- User authentication and session management
- Learning modules and quiz system
- Conversation history tracking
- Responsive web interface

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL + SQLAlchemy ORM
- **AI/ML**:
  - OpenAI Whisper (STT)
  - Google Cloud Text-to-Speech
  - Google Vertex AI (Gemini 2.0 Flash Exp)
- **Audio Processing**: PyTorch, SoundFile, Pydub

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Styling**: Premium Google Fonts for all Indian scripts

### DevOps
- **Migrations**: Alembic
- **Environment**: Python 3.11+, Node.js 18+

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Google Cloud account (for TTS and Vertex AI)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/DrishtiKosh.git
cd DrishtiKosh
```

#### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and API keys
```

**Required Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/drishtikosh_db
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
PROJECT_ID=your-gcp-project-id
LOCATION=us-central1
SECRET_KEY=your-secret-key-here
```

#### 3. Database Setup
```bash
# Create database
createdb drishtikosh_db

# Run migrations
alembic upgrade head
```

#### 4. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 5. Start Backend
```bash
cd ../backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

---

## 📖 Usage

### Blind Mode (Voice Interaction)
1. Navigate to the "Blind Mode" section
2. Click the microphone button to start recording
3. Speak your question in any supported language
4. The AI will respond in audio (same language)

### Image Description
1. Upload an image in Blind Mode
2. The AI will describe the image in detail
3. Response is delivered via audio

### Learning Modules
- Access structured courses on various topics
- Take quizzes to test your knowledge
- Track your progress over time

---

## 🏗️ Project Structure

```
DrishtiKosh/
├── backend/
│   ├── app/
│   │   ├── core/          # Database, config
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Audio, AI services
│   │   └── main.py        # FastAPI app
│   ├── alembic/           # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
│   └── package.json
└── README.md
```

---

## 🔑 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

### Blind Mode
- `POST /blind/interact` - Main voice interaction endpoint
  - Accepts: audio file, image file, text
  - Returns: AI response (text + audio)
- `POST /blind/end_conversation` - End active session
- `GET /blind/history/{user_id}` - Retrieve conversation history

### Learning
- `GET /learn/modules` - List all learning modules
- `POST /learn/quiz/submit` - Submit quiz answers

---

## 🎨 Font Configuration

DrishtiKosh uses premium Google Fonts optimized for each script:

| Language | Font Family |
|----------|-------------|
| English | Inter |
| Hindi/Marathi | Mukta |
| Bengali/Assamese | Hind Siliguri |
| Tamil | Mukta Malar |
| Telugu | Mandali |
| Kannada | Nunc |
| Malayalam | Manjari |
| Gujarati | Mukta Vaani |
| Punjabi | Mukta Mahee |
| Odia | Baloo 2 |

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 📝 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👥 Authors

- **Aditya Jadhav** - Initial work

---

## 🙏 Acknowledgments

- OpenAI Whisper for speech recognition
- Google Cloud for TTS and AI capabilities
- The open-source community for amazing tools and libraries

---

## 📧 Contact

For questions or support, please open an issue on GitHub.
