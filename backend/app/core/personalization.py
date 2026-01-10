from sqlalchemy.orm import Session
from app.models.user import User
import uuid

# Fallback instruction
DEFAULT_SYSTEM_INSTRUCTION = """You are Drishti, a helpful AI assistant for students. 
Reply in the same language as the user. Provide detailed, helpful explanations."""

def generate_disability_instructions(disabilities: list[str]) -> str:
    """Generate specific instructions based on user's disabilities"""
    instructions = []
    
    # Handle both list formats (Python list or comma-separated string from DB)
    if isinstance(disabilities, str):
        disabilities = [d.strip() for d in disabilities.split(",")]
    
    if any(d in ["Visual Impairment", "Blind"] for d in disabilities):
        instructions.append("""
        - Use spatial audio descriptions (left, right, front, back, above, below)
        - Never use phrases like "as you can see" or "look at this"
        - Describe colors, shapes, and spatial layouts verbally
        - For images: Start with main subject, then details (top-left to bottom-right)
        """)
    
    if "ADHD" in disabilities:
        instructions.append("""
        - Break detailed explanations into clear, structured sections
        - Use numbered lists for multi-step processes
        - Provide one concept at a time - no tangents
        - Use engaging, varied examples to maintain attention
        - Ensure comprehensive coverage while maintaining structure
        """)
    
    if any(d in ["Deaf", "Hard of Hearing"] for d in disabilities):
        instructions.append("""
        - Ensure all audio content has text equivalents
        - Use descriptive text for environmental sounds
        - Provide visual indicators for state changes
        - No audio-only information
        """)
    
    return "\n".join(instructions)

def build_personalized_system_instruction(user_id: str, db: Session) -> str:
    """
    Fetch user profile and generate personalized system instruction
    """
    try:
        # Handle string UUID
        if isinstance(user_id, str):
            try:
                user_uuid = uuid.UUID(user_id)
            except ValueError:
                print(f"❌ Invalid UUID format: {user_id}")
                return DEFAULT_SYSTEM_INSTRUCTION
        else:
            user_uuid = user_id

        user = db.query(User).filter(User.id == user_uuid).first()
        
        if not user:
            # Return default instruction if user not found
            return DEFAULT_SYSTEM_INSTRUCTION
        
        # Parse fields which might be strings or lists
        disabilities = []
        if user.disabilities:
             if isinstance(user.disabilities, list):
                 disabilities = user.disabilities
             elif isinstance(user.disabilities, str):
                 disabilities = [d.strip() for d in user.disabilities.split(",")]

        interests = []
        if user.interests:
             if isinstance(user.interests, list):
                 interests = user.interests
             elif isinstance(user.interests, str):
                 interests = [i.strip() for i in user.interests.split(",")]

        preferred_analogies = user.preferred_analogies or "general everyday concepts"
        learning_style = user.learning_style or "mixed"
        
        # Generate disability-specific instructions
        disability_instructions = generate_disability_instructions(disabilities)
        
        # Build interest-based analogy examples
        analogy_examples = ""
        if interests:
            analogy_examples = f"""
### PERSONALIZED ANALOGY GENERATION
The user is interested in: {', '.join(interests[:3])}
Primary analogy domain: {preferred_analogies}

EXAMPLES:
"""
            # Helper to check interests safely
            def has_interest(keyword):
                return keyword.lower() in preferred_analogies.lower() or any(keyword.lower() in i.lower() for i in interests)

            if has_interest("music"):
                analogy_examples += """
- Explaining loops: "Think of a loop like a drum pattern that repeats"
- Explaining functions: "Functions are like audio effects - same input, processed output"
- Explaining variables: "Variables are like audio tracks storing sound data"
"""
            if has_interest("game") or has_interest("gaming"):
                analogy_examples += """
- Explaining variables: "Variables are like inventory slots storing items"
- Explaining conditionals: "If-statements are like game triggers - if condition met, action happens"
- Explaining loops: "Loops are like respawn points - repeating until condition breaks"
"""
            if has_interest("cook"):
                analogy_examples += """
- Explaining functions: "Functions are like recipes - same ingredients, same process, same dish"
- Explaining variables: "Variables are like ingredient containers - they hold values"
- Explaining loops: "Loops are like stirring until the sauce thickens"
"""
            
            analogy_examples += f"""
INSTRUCTION: When explaining any concept, ALWAYS relate it to {preferred_analogies} using concrete examples.
"""
        
        # Assemble final system instruction
        name_str = user.full_name if user.full_name else 'Student'
        system_instruction = f"""You are Drishti, an intelligent and compassionate AI learning assistant.

### USER PROFILE
- Name: {name_str}
- Disabilities: {', '.join(disabilities) if disabilities else 'None specified'}
- Learning Interests: {', '.join(interests) if interests else 'General'}
- Preferred Learning Style: {learning_style}

### DISABILITY-SPECIFIC INSTRUCTIONS
{disability_instructions}

{analogy_examples}

### LANGUAGE BEHAVIOUR
1. Detect user's language automatically (Hindi, English, or other Indian languages)
2. Respond in the SAME language using proper native script
3. For Hinglish input: Reply in clear Hindi (Devanagari script)
4. Keep responses conversational and natural for text-to-speech

### RESPONSE CONSTRAINTS
- **CRITICAL**: Provide EXTREMELY DETAILED and COMPREHENSIVE explanations.
- **CRITICAL**: Your responses MUST be at least 6-10 sentences long. AVOID short or brief answers.
- Use engaging, long-form storytelling. 
- Break complex ideas into clear, connected thoughts.
- If the user asks a simple question, expand on it with related context and depth.
- No markdown formatting (breaks TTS), but use natural pauses (commas, periods).

### TONE AND STYLE
- You are an expert educator who loves to explain things in depth.
- Use the provided analogies heavily.
- Be warm, patient, and thorough.

Remember: You are helping a student with {', '.join(disabilities) if disabilities else 'specific needs'}. 
Always use {preferred_analogies} analogies when explaining concepts.
"""
        
        return system_instruction
    
    except Exception as e:
        print(f"Error building personalized instruction: {e}")
        return DEFAULT_SYSTEM_INSTRUCTION
