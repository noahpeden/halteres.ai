import requests
from bs4 import BeautifulSoup
from openai import OpenAI
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase setup
url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embeddings(text):
    response = client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    embedding = response.data[0].embedding  
    return embedding

def insert_into_supabase(title, body, embedding):
    # Check if the workout already exists
    exists = supabase.table("external_workouts").select("id").eq("title", title).execute()
    
    if exists.data and len(exists.data) > 0:
        print("Workout already exists, skipping insert.")
        return
    
    # Proceed with the insert if the workout does not exist
    data = {"title": title, "body": body, "embedding": embedding}
    response = supabase.table("external_workouts").insert(data).execute()
    
    if hasattr(response, 'status_code') and response.status_code == 200:
        print("Data inserted successfully")
    else:
        if hasattr(response, 'error'):
            error = response.error() if callable(response.error) else response.error
            print(f"Error inserting data: {error}")
        else:
            print("Failed to insert data, but no error information is available.")

def scrape_and_process():
    page = 1
    while True:
        url = f'https://www.crossfit.com/workout/2020?page={page}'
        response = requests.get(url)
        if response.status_code != 200:
            break  

        soup = BeautifulSoup(response.content, 'html.parser')
        workout_elements = soup.find_all(class_='content')
        if not workout_elements:
            break  

        for element in workout_elements:
            if element.find('strong', text='Rest Day'):
                continue  

            title_element = element.find(class_='show')
            if title_element:
                title = title_element.get_text().strip()
                body = element.get_text().strip() 
                
                embedding = get_embeddings(body)  
                insert_into_supabase(title, body, embedding) 

        page += 1  

scrape_and_process()
