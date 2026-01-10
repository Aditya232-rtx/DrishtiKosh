
import asyncio
import os
import sys
from difflib import SequenceMatcher
from app.services.audio import AudioService

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

async def test_stt_long():
    print("--- Starting STT Deep Verification (Long Samples 5-6 lines) ---")
    audio_service = AudioService()
    
    # 5-6 Sentences per language
    TEST_DATA = {
        'hi': {
            'text': "नमस्ते। भारत एक विशाल और सुंदर देश है। यहाँ के लोग बहुत मिलनसार हैं और विविध संस्कृतियों का सम्मान करते हैं। मुझे भारतीय शास्त्रीय संगीत सुनना बहुत पसंद है। प्रौद्योगिकी हमारे जीवन को तेजी से बदल रही है। हमें नई चीजों को सीखने के लिए हमेशा तैयार रहना चाहिए।",
            'lang_name': "Hindi"
        },
        'en': {
            'text': "Hello. India is a vast and beautiful country. The people here are very friendly and respect diverse cultures. I love listening to Indian classical music very much. Technology is changing our lives rapidly. We should always be ready to learn new things.",
            'lang_name': "English"
        },
        'mr': {
            'text': "नमस्कार. भारत हा एक विशाल आणि सुंदर देश आहे. येथील लोक खूप प्रेमळ आहेत आणि विविध संस्कृतींचा आदर करतात. मला भारतीय शास्त्रीय संगीत ऐकायला खूप आवडते. तंत्रज्ञान आपले जीवन झपाट्याने बदलत आहे. आपण नवीन गोष्टी शिकण्यासाठी नेहमी तयार राहिले पाहिजे.",
            'lang_name': "Marathi"
        },
        'bn': {
            'text': "নমস্কার। ভারত একটি বিশাল এবং সুন্দর দেশ। এখানকার মানুষ খুব বন্ধুত্বপূর্ণ এবং বৈচিত্র্যময় সংস্কৃতিকে সম্মান করে। আমি ভারতীয় শাস্ত্রীয় সঙ্গীত শুনতে খুব পছন্দ করি। প্রযুক্তি আমাদের জীবনকে দ্রুত পরিবর্তন করছে। নতুন কিছু শেখার জন্য আমাদের সর্বদা প্রস্তুত থাকা উচিত।",
            'lang_name': "Bengali"
        },
        'gu': {
            'text': "નમસ્તે. ભારત એક વિશાળ અને સુંદર દેશ છે. અહીંના લોકો ખૂબ જ મૈત્રીપૂર્ણ છે અને વિવિધ સંસ્કૃતિઓનું સન્માન કરે છે. મને ભારતીય શાસ્ત્રીય સંગીત સાંભળવું ખૂબ ગમે છે. ટેક્નોલોજી આપણા જીવનને ઝડપથી બદલી રહી છે. આપણે હંમેશા નવી વસ્તુઓ શીખવા માટે તૈયાર રહેવું જોઈએ.",
            'lang_name': "Gujarati"
        },
        'ta': {
            'text': "வணக்கம். இந்தியா ஒரு பரந்த மற்றும் அழகான நாடு. இங்குள்ள மக்கள் மிகவும் நட்பானவர்கள் மற்றும் பலதரப்பட்ட கலாச்சாரங்களை மதிக்கிறார்கள். எனக்கு இந்திய கிளாசிக்கல் இசை கேட்பது மிகவும் பிடிக்கும். தொழில்நுட்பம் நம் வாழ்க்கையை விரைவாக மாற்றி வருகிறது. புதிய விஷயங்களைக் கற்றுக்கொள்ள நாம் எப்போதும் தயாராக இருக்க வேண்டும்.",
            'lang_name': "Tamil"
        },
        'te': {
            'text': "నమస్కారం. భారతదేశం విశాలమైన మరియు అందమైన దేశం. ఇక్కడి ప్రజలు చాలా స్నేహపూర్వకంగా ఉంటారు మరియు విభిన్న సంస్కృతులను గౌరవిస్తారు. నాకు భారతీయ శాస్త్రీయ సంగీతం వినడం చాలా ఇష్టం. సాంకేతికత మన జీవితాలను వేగంగా మారుస్తోంది. క్రొత్త విషయాలను నేర్చుకోవడానికి మనం ఎల్లప్పుడూ సిద్ధంగా ఉండాలి.",
            'lang_name': "Telugu"
        },
        'kn': {
            'text': "ನಮಸ್ಕಾರ. ಭಾರತ ಒಂದು ವಿಶಾಲ ಮತ್ತು ಸುಂದರ ದೇಶ. ಇಲ್ಲಿನ ಜನರು ಸ್ನೇಹಪರರು ಮತ್ತು ವೈವಿಧ್ಯಮಯ ಸಂಸ್ಕೃತಿಗಳನ್ನು ಗೌರವಿಸುತ್ತಾರೆ. ನನಗೆ ಭಾರತೀಯ ಶಾಸ್ತ್ರೀಯ ಸಂಗೀತವನ್ನು ಕೇಳಲು ತುಂಬಾ ಇಷ್ಟ. ತಂತ್ರಜ್ಞಾನ ನಮ್ಮ ಜೀವನವನ್ನು ವೇಗವಾಗಿ ಬದಲಾಯಿಸುತ್ತಿದೆ. ಹೊಸ ವಿಷಯಗಳನ್ನು ಕಲಿಯಲು ನಾವು ಯಾವಾಗಲೂ ಸಿದ್ಧರಾಗಿರಬೇಕು.",
            'lang_name': "Kannada"
        },
        'ml': {
            'text': "നമസ്കാരം. ഇന്ത്യ വിശാലവും മനോഹരവുമായ ഒരു രാജ്യമാണ്. ഇവിടുത്തെ ജനങ്ങൾ വളരെ സ്നേഹമുള്ളവരും വൈവിധ്യമാർന്ന സംസ്കാരങ്ങളെ ബഹുമാനിക്കുന്നവരുമാണ്. ഇന്ത്യൻ ശാസ്ത്രീയ സംഗീതം കേൾക്കാൻ എനിക്ക് വളരെ ഇഷ്ടമാണ്. സാങ്കേതികവിദ്യ നമ്മുടെ ജീവിതത്തെ അതിവേഗം മാറ്റിക്കൊണ്ടിരിക്കുകയാണ്. പുതിയ കാര്യങ്ങൾ പഠിക്കാൻ നമ്മൾ എപ്പോഴും തയ്യാറായിരിക്കണം.",
            'lang_name': "Malayalam"
        },
        'pa': {
            'text': "ਸਤ ਸ੍ਰੀ ਅਕਾਲ. ਭਾਰਤ ਇੱਕ ਵਿਸ਼ਾਲ ਅਤੇ ਸੁੰਦਰ ਦੇਸ਼ ਹੈ. ਇੱਥੋਂ ਦੇ ਲੋਕ ਬਹੁਤ ਮਿਲਣਸਾਰ ਹਨ ਅਤੇ ਵਿਭਿੰਨ ਸਭਿਆਚਾਰਾਂ ਦਾ ਸਤਿਕਾਰ ਕਰਦੇ ਹਨ. ਮੈਨੂੰ ਭਾਰਤੀ ਸ਼ਾਸਤਰੀ ਸੰਗੀਤ ਸੁਣਨਾ ਬਹੁਤ ਪਸੰਦ ਹੈ. ਟੈਕਨਾਲੋਜੀ ਸਾਡੀ ਜ਼ਿੰਦਗੀ ਨੂੰ ਤੇਜ਼ੀ ਨਾਲ ਬਦਲ ਰਹੀ ਹੈ. ਸਾਨੂੰ ਨਵੀਂਆਂ ਚੀਜ਼ਾਂ ਸਿੱਖਣ ਲਈ ਹਮੇਸ਼ਾਂ ਤਿਆਰ ਰਹਿਣਾ ਚਾਹੀਦਾ ਹੈ.",
            'lang_name': "Punjabi"
        },
        'as': {
            'text': "নমস্কাৰ। ভাৰত এখন বিশাল আৰু ধুনীয়া দেশ। ইয়াত মানুহবোৰ বৰ মলিউল আৰু বিভিন্ন সংস্কৃতিৰ প্ৰতি সন্মান জনায়। মই ভাৰতীয় ধ্ৰুপদী সংগীত শুনি বৰ ভাল পাওঁ। প্ৰযুক্তিয়ে আমাৰ জীৱন দ্ৰুতগতিত সলনি কৰিছে। আমি সদায় নতুন নতুন কথা শিকিবলৈ সাজু থাকিব লাগে।",
            'lang_name': "Assamese"
        },
        'or': {
            'text': "ନମସ୍କାର | ଭାରତ ଏକ ବିଶାଳ ଏବଂ ସୁନ୍ଦର ଦେଶ | ଏଠାରେ ଲୋକମାନେ ବହୁତ ବନ୍ଧୁତ୍ୱପୂର୍ଣ୍ଣ ଏବଂ ବିଭିନ୍ନ ସଂସ୍କୃତିକୁ ସମ୍ମାନ କରନ୍ତି | ମୁଁ ଭାରତୀୟ ଶାସ୍ତ୍ରୀୟ ସଙ୍ଗୀତ ଶୁଣିବାକୁ ବହୁତ ଭଲ ପାଏ | ଟେକ୍ନୋଲୋଜି ଆମ ଜୀବନକୁ ଦ୍ରୁତ ଗତିରେ ବଦଳାଉଛି | ନୂତନ ଜିନିଷ ଶିଖିବାକୁ ଆମେ ସର୍ବଦା ପ୍ରସ୍ତୁତ ରହିବା ଉଚିତ୍ |",
            'lang_name': "Odia"
        }
    }
    
    results = []
    
    # Header for Console Output
    print(f"{'Language':<15} | {'Code':<5} | {'Match?':<8} | {'Score':<6} | {'Detected':<10}")
    print("-" * 65)

    report_lines = []
    report_lines.append(f"| Language | Code | Lang Match? | Sim Score | Detected Code | Expected | Detected Text |")
    report_lines.append(f"|---|---|---|---|---|---|---|")

    for lang_code, data in TEST_DATA.items():
        text = data['text']
        lang_name = data['lang_name']
        
        try:
            # 1. Generate TTS
            audio_buffer = await audio_service.text_to_speech(text, language_code=lang_code)
            if not audio_buffer:
                print(f"{lang_name:<15} | {lang_code:<5} | {'ERROR':<8} | {'0.00':<6} | {'TTS Failed':<10}")
                report_lines.append(f"| {lang_name} | {lang_code} | ❌ Error | 0.00 | N/A | TTS Failed | N/A |")
                continue
            
            audio_bytes = audio_buffer.read()
            
            # 2. Recognize STT
            stt_result = await audio_service.speech_to_text(audio_bytes)
            
            detected_code = stt_result.get("language", "unknown")
            transcription = stt_result.get("text", "")
            
            # 3. Analyze
            lang_match = "✅" if detected_code == lang_code else "❌"
            sim_score = similarity(text, transcription)
            
            # Special Case: Assamese (as) often detected as Bengali (bn) due to script overlap
            # Special Case: Odia/Marathi detected as Hindi sometimes
            
            print(f"{lang_name:<15} | {lang_code:<5} | {lang_match:<8} | {sim_score:.2f}   | {detected_code:<10}")
            
            # Truncate text for table
            tr_text_short = (transcription[:50] + '...') if len(transcription) > 50 else transcription
            
            report_lines.append(f"| {lang_name} | {lang_code} | {lang_match} | {sim_score:.2f} | {detected_code} | {lang_code} | {tr_text_short} |")

        except Exception as e:
            print(f"{lang_name:<15} | {lang_code:<5} | {'ERROR':<8} | {'0.00':<6} | {str(e)[:10]}")
            report_lines.append(f"| {lang_name} | {lang_code} | ❌ Error | 0.00 | N/A | Error | {str(e)} |")

    # Write Report
    with open("stt_evaluation_report.md", "w") as f:
        f.write("# STT Deep Evaluation Report\n\n")
        f.write("Evaluation of Whisper Model on 5-6 sentence audio samples generated via Google Cloud TTS.\n\n")
        f.write("\n".join(report_lines))
        f.write("\n\n## Analysis\n")
        f.write("- **Scores**: 0.0 to 1.0 (1.0 is perfect match).\n")
        f.write("- **Lang Match**: Whether the detected language code matches exactly.\n")
    
    print("-" * 65)
    print("Report saved to stt_evaluation_report.md")

if __name__ == "__main__":
    asyncio.run(test_stt_long())
