import os
import time
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client
import json
from tqdm import tqdm

# Load environment variables
load_dotenv()

# Supabase setup
url: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# OpenAI setup
client = OpenAI(api_key=os.getenv("NEXT_PUBLIC_OPENAI_API_KEY"))

def get_embeddings(text):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.embeddings.create(
                input=text,
                model="text-embedding-3-large"
            )
            embedding = response.data[0].embedding
            
            # Split the 3,072-dimensional embedding into two parts
            embedding_part1 = embedding[:2000]
            embedding_part2 = embedding[2000:]
            
            return embedding_part1, embedding_part2
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            print(f"Error getting embedding, retrying... (Attempt {attempt + 1}/{max_retries})")
            time.sleep(2 ** attempt)  # Exponential backoff

def enhance_workout(title, body):
    examples = """
    Example 1:
    Original Workout:
    Title: "How Rude!"
    Body: 81-63-45-27 double unders
    27-21-15-9 goblet squat
    15 GHDs after each round

    Enhanced Workout:
    Title: "How Rude!"
    Body: RX: 81-63-45-27 double unders
    27-21-15-9 goblet squat (53 lb / 35 lb)
    15 GHDs or V-ups after each round

    Scaled: 81-63-45-27 double unders
    27-21-15-9 goblet squat (35 lb / 26 lb)
    10 GHDs (or V-ups) after each round 

    RX+: 108-84-60-36 double unders
    27-21-15-9 goblet squat (70 lb / 53 lb)
    20 GHDs (or V-ups) after each round

    
    Strategy:
    Time Frame
    Intro: 0:00 - 3:00
    Warmup: 3:00 - 14:00
    Gymnastics: 14:00 - 34:00
    Workout: 34:00 - 54:00
    Cleanup/Cooldown: 54:00 - 56:00
    Mobility: 56:00 - 60:00
    
    TARGET SCORE

    •	Target time: 10-12 minutes
    •	Time cap: 15 minutes
    •	Large Class Target Time: 10-12 minutes
    •	Large Class Time Cap: 16 minutes
    
    STIMULUS and GOALS
    •	Stimulus is steady pacing across the descending rep scheme. We want to see athletes push the pace through the rope and squats while using strategic and purposeful pacing on the GHDs to recover for sustainability.

    •	Controlling the heart rate and breathing will be the real challenge of the this workout. Unbroken will be tempting for some athletes, but noted that quick breaks maybe the key to survival and keeping  intensity up.

    WORKOUT STRATEGY & FLOW
    •	Double Unders: 1-2 sets is the goal across all sets. This will be challenging as the heavy legs and tired lungs make jumping much more difficult. Take a deep breath before starting, and ensure athletes lay the rope down after each set. Hands should stay by the sides/slightly in front of the body, and shoulders should stay relaxed to avoid tripping on the rope. If athletes cannot consistently perform double unders, have them modify to single unders, perform plate hops to a 10lb hi-temp, or perform high bunny jumps with a double tap on the legs with each hand during each jump to help train timing of double unders. Ensure that athletes are not excessively pulling the feet back in a donkey kick motion and not excessively piking forward (both of which will increase the chance of catching on the rope).

    * Kettlebell Goblet Squats: The weight selected should allow reps to be completed in 1-2 sets. Unbroken is ideal after the first two rounds. Athletes will hold a single KB with both hands at chest height. The KB must be held in the frontal plane and cannot be racked on the shoulder. Athletes can choose to grab the KB by the horns or flip it over and hold it by the bell. Athletes will squat below parallel and stand to complete a rep with a focus on keeping the chest up throughout the rep. Taking a deep breath at the top and breathing out when standing out of the squat will assist with bracing and pacing. Athletes should ensure that the KB stays as close to the chest as possible to avoid placing unnecessary strain on the low back. 

    •	GHD situps: Pacing should be smooth and steady while trying to stay non-stop. Ensure athletes know how to adjust the GHD quickly if heights differ. Always speak to athletes about the risks of rhabdo when demoing GHDs (not to scare athletes, but to bring awareness). It’s important to mention that they should not apply heat to the muscles if they experience severe cramping, as this can make rhabdo worse. If an athlete suspects they have rhabdo or their urine turns a dark brown, they should go to the hospital immediately. The footpad setting on the GHD should allow the hips to be slightly past the peak of the hip pad while the legs are slightly bent. Focus when sitting back should be a slight bend in the knees, neutral head, and wide arms. Focus when sitting up should be an extension of the legs, throwing the arms, and breathing out. Athletes who are new or returning from a break are highly encouraged to modify this movement. Modify this movement to GHDs to parallel, strict abmat situps (hands behind the head or crossed over the chest) or abmat situps. 
    
    •	Coaches: Keep stations close and try and keep on athletes about over resting between sets and movements.
    
    SCALING
    •	The Scaling aim is for athletes to stay within the target time.

    
    Scaling Options:
    RX+ (Competitor):
    108-84-60-36
    Double Unders
    27-21-15-9
    Goblet Squat (70/53)
    20 GHDs (Or V-Ups) after each round
    (KG conv: 32/24)

    RX:
    81-63-45-27
    Double Unders
    27-21-15-9
    Goblet Squat (35/26)
    10 GHDS (Or V-Ups) after each round
    (KG conv: 16/12)
    
    Scaled:
    81-63-45-27
    SIngle Unders
    27-21-15-9
    Goblet Squat (light)
    15 sit ups after each round
    
    Limited Equipment or Beginner:
    81-63-45-27
    Line Hops
    54-42-30-18
    Air Squats
    15 Sit Ups after each round

    Large Class:
    Teams of 2
    Partner 1: 81-63-45-27 Double Unders
    Partner 2: 27-21-15-9 Goblet Squat (53/35)
    Switch after both are complete
    15 Synchro V-Ups
    (KG conv: 24/16)
    Workout Flow: P1 performs 81 double unders while P2 completes 27 goblet squats. When they are both done, they switch (P1 performs 27 goblet squats while P2 performs 81 double unders). When they are both done, they perform 15 synchro v-ups. That is the first round.

    Example 2:
    Original Workout:
    Title: "Full House"
    Body: 13-11-9-7-5
    Snatch (115/85)
    C2B Pull Ups

    Enhanced Workout:
    Title: "Full House"
    Body:  Time cap: 12 minutes
    RX
    13-11-9-7-5
    Snatch (115/85)
    C2B Pull Up
    * The Snatches are Squat, not Power

    Scaled
    13-11-9-7-5
    Snatch (95/65)
    Pull Ups

    RX+
    13-11-9-7-5
    Snatch (135/95)
    Bar Muscle Ups

    Strategy:
    # Time Frame
    Intro: 0:00 - 3:00
    Warmup: 3:00 - 15:00
    Strength: 15:00 - 34:00
    Workout: 34:00 - 52:00
    Cleanup/Cooldown: 52:00 - 55:00
    Mobility: 55:00 - 60:00
    
    # TARGET SCORE

    * Target time: 7-9 minutes
    * Time cap: 12 minutes
    * Large Class Target Time: 12-14 minutes
    * Large Class Time Cap: 18 minutes
    
    # STIMULUS and GOALS
    * Stimulus is moderate intensity across workout with utilization of strategic breaks and consistency on sets will help athletes stay steady. Being mindful of the constant pulling and understanding the rest between sets and movements is crucial to survival.

    * This is a very high skilled workout where athletes need to focus on being fluent with each movement and not fixated about speed. 

    # WORKOUT STRATEGY & FLOW
    * Snatch: The weight selected should be moderately light (65%), and athletes could hit 5+ touch-and-go reps without breaking down in the form. In this workout, athletes should aim for smooth and steady singles. Regardless, the weight should not be an issue, so athletes pick a strategy to avoid over-resting between sets. Use the warm-up period to focus on good touch-and-go reps. Demo and encourage the use of hook grip for all athletes (even if they have tiny hands). Cue athletes to load the hips and drive with the legs with each rep. Once full extension has been reached, athletes should aggressively pull themselves under the bar (moving the feet from the jumping to the landing position). When receiving the bar, athletes should “punch” into it and avoid standing too quickly before establishing a solid catch. Athletes should aim for fast and consistent singles across each round.
    
    * Chest to Bar: Unbroken would be great, but I will live if athletes need to break into 2 quick sets. Athletes should choose a grip width similar to their regular pull-up grip or slightly wider to accommodate the space needed to get their chest to the bar. For athletes who can butterfly regular pull-ups but cannot butterfly chest to bar, encourage them to stick with kipping to keep reps consistent and avoid no-repping. If they can’t perform butterfly chest-to-bar pull-ups before the workout, they should practice it later as an accessory piece when fresh. But for now, have them stick with kipping. Modify this movement to kipping pull-ups, ring rows, or jumping pull-ups. Choose wisely when deciding the size of sets you want to take on. Small, quick sets will help prevent burnout from happening in later rounds.
    
    * Coaches: Advanced athletes should try the muscle up version if proficient in the movement.
    
    # SCALING

    * The Scaling aim is for athletes to stay aggressive on both bars. 
    * Competitor:
    13-11-9-7-5
    Snatch (135/95)
    Bar Muscle Ups
    (KG conv: 60/42.5)

    * RX:
    13-11-9-7-5
    Snatch (95/65)
    Pull Ups
    (KG conv: 42.5/30)

    * Scaled:
    13-11-9-7-5
    Alternating Dumbbell Snatch (light)
    Jumping Pull Ups
    
    * Limited Equipment Option 
    26-22-18-14-10
    Air Squats
    13-11-9-7-5
    Burpees
    Chest to Bar

    * Large Class:
    Teams of 2
    26-22-18-14-10
    Snatch (115/85)
    Chest to Bar
    (KG conv: 52.5/37.5)
    One partner works at a time, share the reps.
    """

    prompt = f"""
        Here are some examples of enhanced workouts to guide your response:

        {examples}

        Using the format and level of detail shown in these examples, please enhance the following workout:

        1. Body: Include RX, Scaled, and RX+ versions with specific weights and modifications.
        2. Strategy:
        - Time Frame: Break down the class structure
        - Target Score: Include target times and time caps
        - Stimulus and Goals: Describe the intended stimulus and overall goals
        - Workout Strategy & Flow: Provide detailed strategies for each movement
        - Scaling: Explain the scaling aim and provide specific scaling options
        
        Please format the enhanced workout in a clear, easy-to-read structure following this outline:

        Title: [Original Title]
        Body: 
        [RX, Scaled, and RX+ versions with weights]

        Strategy:
        Time Frame
        [Break down of class structure]

        TARGET SCORE
        [Target times and time caps]

        STIMULUS and GOALS
        [Description of intended stimulus and overall goals]

        WORKOUT STRATEGY & FLOW
        • [Movement 1]: [Detailed strategy including form cues, pacing advice, and common faults to avoid]
        • [Movement 2]: [Detailed strategy including form cues, pacing advice, and common faults to avoid]
        • [Movement 3]: [Detailed strategy including form cues, pacing advice, and common faults to avoid]
        • Coaches: [Any specific instructions for coaches during the workout]

        SCALING
        [Scaling aim and specific options for RX+, RX, Scaled, Limited Equipment, and Large Class]

        Now, enhance the following workout:

        Workout Title: {title}
        Workout Body:
        {body}
        """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a knowledgeable CrossFit coach tasked with enhancing workout descriptions. Follow the provided examples closely for formatting and content. Ensure you provide detailed strategies and scaling options for each movement, including form cues, pacing advice, and common faults to avoid."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content

def update_supabase_with_enhanced_workout(row_id, title, enhanced_body, embedding_part1, embedding_part2):
    try:
        response = supabase.table("external_workouts").update({
            "body": enhanced_body,
            "embedding_part1": embedding_part1,
            "embedding_part2": embedding_part2
        }).eq("id", row_id).execute()
        
        if not response.data:
            print(f"No data updated for row {row_id}")
            print(f"Response: {json.dumps(response.dict(), indent=2)}")
            return False
        return True
    except Exception as e:
        print(f"Error updating workout and embedding for row {row_id}: {str(e)}")
        print(f"Error details: {e.__class__.__name__}: {str(e)}")
        if hasattr(e, 'response'):
            print(f"Response content: {e.response.content}")
        return False

def process_workouts(batch_size=10, start_from=0):
    offset = start_from
    total_processed = 0
    errors = []

    while True:
        try:
            response = supabase.table("external_workouts").select("id", "title", "body").range(offset, offset + batch_size - 1).execute()
            workouts = response.data
            
            if not workouts:
                break  # No more workouts to process

            for workout in tqdm(workouts, desc=f"Processing batch starting at {offset}"):
                row_id = workout['id']
                title = workout['title']
                body = workout['body']
                
                try:
                    enhanced_body = enhance_workout(title, body)
                    embedding_part1, embedding_part2 = get_embeddings(f"{title}\n{enhanced_body}")
                    
                    success = update_supabase_with_enhanced_workout(row_id, title, enhanced_body, embedding_part1, embedding_part2)
                    
                    if success:
                        total_processed += 1
                    else:
                        errors.append(row_id)
                
                except Exception as e:
                    print(f"Error processing row {row_id}: {str(e)}")
                    errors.append(row_id)
                
                time.sleep(1)  # Rate limiting
            
            offset += batch_size
            
            # Save progress
            with open('progress.json', 'w') as f:
                json.dump({'last_processed': offset, 'total_processed': total_processed, 'errors': errors}, f)
            
        except Exception as e:
            print(f"Error fetching workouts: {str(e)}")
            time.sleep(60)  # Wait for a minute before retrying
    
    print(f"Processing complete. Total processed: {total_processed}")
    print(f"Errors encountered for rows: {errors}")

if __name__ == "__main__":
    # Check for existing progress
    if os.path.exists('progress.json'):
        with open('progress.json', 'r') as f:
            progress = json.load(f)
        start_from = progress['last_processed']
        print(f"Resuming from workout {start_from}")
    else:
        start_from = 0
    
    process_workouts(batch_size=10, start_from=start_from)