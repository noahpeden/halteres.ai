import os
import time
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Supabase setup
url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

# OpenAI setup
client = OpenAI(api_key=os.getenv("NEXT_PUBLIC_OPENAI_API_KEY"))

def get_embeddings(texts):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.embeddings.create(
                input=texts,
                model="text-embedding-3-large"
            )
            return [embedding.embedding for embedding in response.data]
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"Failed to get embeddings after {max_retries} attempts: {str(e)}")
                return None
            print(f"Error getting embeddings (attempt {attempt + 1}/{max_retries}): {str(e)}")
            time.sleep(2 ** attempt)  # Exponential backoff

def update_supabase_with_embeddings(rows, embeddings):
    updates = []
    for row, embedding in zip(rows, embeddings):
        updates.append({
            "id": row['id'],
            "embedding_part1": embedding[:2000],
            "embedding_part2": embedding[2000:]
        })
    
    try:
        response = supabase.table("external_workouts").upsert(updates).execute()
        return len(response.data)
    except Exception as e:
        print(f"Error updating embeddings: {str(e)}")
        return 0

def process_external_workouts(batch_size=20):
    try:
        with open('last_processed_id.txt', 'r') as f:
            last_id = int(f.read().strip())
    except FileNotFoundError:
        last_id = 0

    # Get total count of remaining records
    count_response = supabase.table("external_workouts").select("id", count="exact").gt("id", last_id).execute()
    total_remaining = count_response.count

    with tqdm(total=total_remaining, desc="Processing workouts") as pbar:
        while True:
            response = supabase.table("external_workouts").select("id", "title", "body").gt("id", last_id).order("id").limit(batch_size).execute()
            
            if not response.data:
                break

            rows = response.data
            texts = [f"{row['title']}\n{row['body']}" for row in rows]
            
            embeddings = get_embeddings(texts)
            if embeddings:
                updated_count = update_supabase_with_embeddings(rows, embeddings)
                pbar.update(updated_count)
            
                last_id = rows[-1]['id']
                with open('last_processed_id.txt', 'w') as f:
                    f.write(str(last_id))
            
            time.sleep(1)  # Rate limiting

if __name__ == "__main__":
    try:
        process_external_workouts()
        print("Processing completed successfully.")
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Progress has been saved.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")