import google.generativeai as genai
import json
import os
import glob
from supabase import create_client

# Ensure environment variables are set before running
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not GEMINI_API_KEY or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Missing required environment variables. Please set GEMINI_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_KEY.")
    exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')
embedding_model = genai.GenerativeModel('text-embedding-004')
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def embed_text(text):
    result = embedding_model.embed_content(text)
    return result['embedding']

def segment_transcript(transcript, debater_name, motion, role):
    prompt = f'''
Segment this debate speech into labeled parts.
Debater: {debater_name} | Motion: {motion} | Role: {role}
Return ONLY a JSON array:
[{{
  "segment_type": "framing" | "argument" | "rebuttal" | "weighing" | "summary" | "intro" | "conclusion",
  "content": "<text of segment>",
  "quality_notes": "<why noteworthy for coaching>"
}}]
TRANSCRIPT: {transcript[:8000]}
'''
    try:
        res = model.generate_content(prompt)
        text = res.text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        print(f"Failed to segment transcript: {e}")
        return []

def main():
    print("Starting segmentation and seeding process...")
    files = glob.glob('speeches/*_clean.json')
    if not files:
        print("No cleaned speech JSON files found in the 'speeches' directory.")
        return

    for filepath in files:
        print(f"Processing {filepath}...")
        with open(filepath) as f:
            data = json.load(f)
        
        # Assuming the JSON contains these keys, otherwise adjust
        transcript = data.get('full_text', '')
        debater_name = data.get('debater_name', 'Unknown')
        motion = data.get('motion', 'Unknown Motion')
        role = data.get('role', 'Unknown Role')

        segments = segment_transcript(transcript, debater_name, motion, role)
        
        for segment in segments:
            try:
                embedding = embed_text(segment['content'])
                
                supabase.table('elite_examples').insert({
                    'debater_name': debater_name,
                    'motion': motion,
                    'role': role,
                    'segment_type': segment['segment_type'],
                    'content': segment['content'],
                    'embedding': embedding,
                    'metadata': {'quality_notes': segment['quality_notes']}
                }).execute()
                print(f"Inserted segment: {segment['segment_type']}")
            except Exception as e:
                print(f"Failed to insert segment: {e}")

    print("Seeding complete.")

if __name__ == '__main__':
    main()
