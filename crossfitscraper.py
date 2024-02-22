import requests
from bs4 import BeautifulSoup
from openai import OpenAI
import os
from dotenv import load_dotenv
from supabase import create_client, Client

url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL") 
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")  
supabase: Client = create_client(url, key)

def insert_into_supabase(workout_text, embedding):
    data = {"workout_text": workout_text, "embedding": embedding}
    response = supabase.table("your_table_name").insert(data).execute()
    if response.error:
        print(f"Error inserting data: {response.error}")
    else:
        print("Data inserted successfully")


load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embeddings(text):
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"  
    )
    embedding = response.data[0].embedding  # Access attributes directly
    return embedding

url = 'https://www.crossfit.com/workout'
response = requests.get(url)
soup = BeautifulSoup(response.content, 'html.parser')
workout_elements = soup.find_all(class_='content')
workouts = [element.get_text().strip() for element in workout_elements]

for workout in workouts:
    embedding = get_embeddings(workout)
    insert_into_supabase(workout, embedding)
    print(embedding)

