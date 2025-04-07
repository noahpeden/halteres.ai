import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI
import datetime

# Load environment variables from .env.local
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
load_dotenv(dotenv_path)

# Supabase setup
url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
# Try to use service role key, fallback to anon key if not available
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not url or not key:
    print("ERROR: Missing Supabase URL or key. Please check your .env.local file.")
    print("Required variables: NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY")
    exit(1)

print(f"Using Supabase URL: {url}")
print(f"Using key starting with: {key[:10]}...")

supabase: Client = create_client(url, key)

# OpenAI setup
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Create logs directory if it doesn't exist
logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../logs")
os.makedirs(logs_dir, exist_ok=True)

# Setup logging
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
log_file = os.path.join(logs_dir, f"reembed_{timestamp}.log")
error_log_file = os.path.join(logs_dir, f"reembed_errors_{timestamp}.log")

def log_message(message):
    """Log message to both console and file"""
    print(message)
    with open(log_file, "a") as f:
        f.write(f"{datetime.datetime.now().isoformat()}: {message}\n")

def log_error(message):
    """Log error to both console and error file"""
    print(f"ERROR: {message}")
    with open(error_log_file, "a") as f:
        f.write(f"{datetime.datetime.now().isoformat()}: {message}\n")

def get_embedding(text):
    """Generate a single embedding using text-embedding-3-small"""
    try:
        response = openai_client.embeddings.create(
            input=text,
            model="text-embedding-3-small"
        )
        embedding = response.data[0].embedding
        
        # Ensure the embedding is exactly 1536 dimensions
        if len(embedding) > 1536:
            log_message(f"Trimming embedding from {len(embedding)} to 1536 dimensions")
            embedding = embedding[:1536]  # Take only the first 1536 dimensions
        elif len(embedding) < 1536:
            log_message(f"Padding embedding from {len(embedding)} to 1536 dimensions")
            embedding = embedding + [0.0] * (1536 - len(embedding))  # Pad with zeros
            
        return embedding
    except Exception as e:
        log_error(f"Error generating embedding: {str(e)}")
        raise

def create_tables_and_functions():
    """Create the necessary tables and functions in Supabase"""
    log_message("Setting up tables and functions in Supabase...")
    
    try:
        # Create the new table for single embeddings
        supabase.rpc("create_workouts_with_single_embedding").execute()
        log_message("Created external_workouts_new table (if it didn't exist already)")
        
        # Create the search function
        supabase.rpc("create_match_workouts_embedding_function").execute()
        log_message("Created match_workouts_embedding function (if it didn't exist already)")
        
        return True
    except Exception as e:
        log_error(f"Error setting up database: {str(e)}")
        return False

def count_workouts():
    """Count total workouts to process"""
    try:
        response = supabase.table("external_workouts").select("id", count="exact").execute()
        return response.count
    except Exception as e:
        log_error(f"Error counting workouts: {str(e)}")
        return 0

def reembed_workouts(batch_size=10, start_id=0, rate_limit_delay=0.5):
    """Process workouts in batches and re-embed them"""
    total = count_workouts()
    log_message(f"Found {total} workouts to re-embed")
    
    processed = 0
    errors = 0
    current_id = start_id
    
    # Don't log every embedding dimension except for the first one
    log_dimensions = True
    
    while True:
        try:
            # Fetch a batch of workouts
            response = supabase.table("external_workouts") \
                              .select("id,title,body,tags,difficulty") \
                              .gt("id", current_id) \
                              .order("id") \
                              .limit(batch_size) \
                              .execute()
            
            workouts = response.data
            
            if not workouts or len(workouts) == 0:
                log_message("No more workouts to process")
                break
            
            log_message(f"Processing batch of {len(workouts)} workouts starting at ID {current_id}")
            
            for workout in workouts:
                try:
                    # Combine title and body for better embedding context
                    text_to_embed = f"{workout['title']} {workout['body']}"
                    
                    # Generate new embedding
                    try:
                        embedding = get_embedding(text_to_embed)
                        
                        # Only log dimensions for the first workout
                        if log_dimensions:
                            log_message(f"First embedding dimensions: {len(embedding)}")
                            log_dimensions = False
                            
                    except Exception as e:
                        log_error(f"Error generating embedding for workout {workout['id']}: {str(e)}")
                        errors += 1
                        current_id = workout["id"]
                        continue
                    
                    # Insert into new table
                    insert_data = {
                        "id": workout["id"],
                        "title": workout["title"],
                        "body": workout["body"],
                        "tags": workout.get("tags", []),
                        "difficulty": workout.get("difficulty", "Intermediate"),
                        "embedding": embedding
                    }
                    
                    try:
                        supabase.table("external_workouts_new").insert(insert_data).execute()
                        
                        processed += 1
                        # Log progress every 10 workouts or for the first and last
                        if processed % 10 == 0 or processed == 1 or processed == total:
                            log_message(f"Re-embedded workout {workout['id']} - {processed}/{total} ({processed/total*100:.1f}%)")
                        
                    except Exception as e:
                        log_error(f"Error inserting workout {workout['id']}: {str(e)}")
                        errors += 1
                    
                    # Update current_id for next batch
                    current_id = workout["id"]
                    
                except Exception as e:
                    errors += 1
                    log_error(f"Error processing workout {workout['id']}: {str(e)}")
                    current_id = workout["id"]
                
                # Sleep to avoid rate limits
                time.sleep(rate_limit_delay)
                
        except Exception as e:
            log_error(f"Error processing batch: {str(e)}")
            errors += 1
            time.sleep(2)  # Longer delay after an error
    
    return processed, errors

def main():
    log_message("Starting workout re-embedding process")
    
    # Create necessary tables and functions
    if not create_tables_and_functions():
        log_error("Failed to set up database. Exiting.")
        return
    
    # Re-embed workouts
    processed, errors = reembed_workouts(batch_size=10)
    
    log_message(f"Re-embedding process complete.")
    log_message(f"Processed: {processed} workouts")
    log_message(f"Errors: {errors}")
    
    if errors == 0:
        log_message("All workouts successfully re-embedded!")
        log_message("You can now use the new search endpoint at /api/search-workouts-new")
    else:
        log_message(f"Process completed with {errors} errors. Check the error log for details.")

if __name__ == "__main__":
    main() 