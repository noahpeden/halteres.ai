'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import OpenAI from 'openai';
import jsPDF from 'jspdf';
import ReviewDetails from './ReviewDetails';
import { useChatCompletion } from '../hooks/useOpenAiStream/chat-hook';
import { useAuth } from '../contexts/AuthContext';
import { createClient } from '../utils/supabase/client';

export default function Metcon({ params }) {
  const supabase = createClient();
  const { user } = useAuth();
  const { office, whiteboard, readyForQuery } = useOfficeContext();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [internalWorkouts, setInternalWorkouts] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [matchedWorkouts, setMatchedWorkouts] = useState([]);
  const [savedMetcons, setSavedMetcons] = useState([]);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const textAreaRef = useRef(null);

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const userPrompt = `
  Create a detailed workout program for a ${
    whiteboard.personalization
  } for the next ${whiteboard.programLength} days or weeks. The user is a ${
    whiteboard.personalization
  } and the gym they own has the following details:
  - Equipment: ${
    office?.equipmentList
  }. Be sure to not include any equipment that is not listed.
  - Coaching staff experience: ${
    office?.coachList?.length
      ? office?.coachList.map((coach) => coach.experience).join(', ')
      : 'Not specified'
  }
  - Class schedule: ${office?.classSchedule}
  - Class duration: ${office?.classDuration}
  - Workout format: ${whiteboard.workoutFormat}
  - Workout cycle length: ${whiteboard.programLength}
  - Workout focus: ${whiteboard.focus}
  - Quirks: ${whiteboard.quirks}
  - Gym name: ${office?.gymName}

  Please use the following as primary references for workout structure and style:
  1. Example workout: ${whiteboard.exampleWorkout}
  2. Uploaded workouts: ${
    matchedWorkouts.length
      ? matchedWorkouts.map((workout) => workout.content).join(', ')
      : 'No uploaded workout provided'
  }
  `;

  const systemPrompt = `
  As a knowledgeable CrossFit coach, create a comprehensive ${whiteboard.programLength}-day workout plan tailored to a ${whiteboard.personalization}. Follow this structure for each day's workout:

  Start with a detailed Intro to the entire program of workouts, including what the focus is (${whiteboard.focus}), the length of the program (${whiteboard.programLength}), and the intended outcomes for the ${whiteboard.personalization}.

  1. Title: Create a unique, engaging title for each workout.

  2. Body: 
    - RX: Provide the main workout with specific weights and movements with options, percentages, and RPE for male and female.
    - Scaled: Offer a scaled version with adjusted weights and movement modifications.
    - RX+: Include a more challenging version for advanced athletes.

  3. Coaching Strategy:
    a. Time Frame: Break down the class structure (e.g., Intro, Warmup, Strength, Workout, Cooldown, Mobility or ${whiteboard.workoutFormat}).
    b. Target Score: Include target times and time caps for the workout.
    c. Stimulus and Goals: Describe the intended stimulus and overall goals of the workout.

  4. Workout Strategy & Flow:
    - For each movement, provide detailed strategies including:
      • Form cues
      • Pacing advice
      • Common faults to avoid
      • Specific weights for male and female athletes
    - Include coach's notes and suggestions for each strength and conditioning component.

  5. Scaling:
    - Explain the scaling aim
    - Provide specific options for RX+, RX, Scaled, Limited Equipment, and Large Class scenarios

  Key points to remember:
  - Each week builds on the previous week's progress.
  - Make sure there is variety in movements and time domains.
  - Include benchmark workouts and retests to track progress at the beginning and end of the program.
  - Integrate the provided template workout and/or internal workouts as primary influences.
  - Generate exactly ${whiteboard.programLength} unique workouts.
  - Use the matched external workouts as references to inform your programming.
  - Include specific stretches and cool-down movements if requested in the workout format.
  - Ensure each day's workout is unique and specific, avoiding repetitions or generic instructions.
  - Use RPE (Rate of Perceived Exertion) scales to guide intensity levels as well as percentages of max lifts.
  - DO NOT USE ANY EQUIPMENT THAT IS NOT INCLUDED IN ${office?.equipmentList}.
  - If the user has requested specific movements or types of workouts, incorporate those preferences into the program.
  - If has said in ${whiteboard.quirks} that there are any quirks or special features of the gym, make sure to take those into account in the program creation.

  Your goal is to create a high-quality, personalized workout program that matches or exceeds the detail and specificity of professionally curated CrossFit workouts.

  Make sure to structure it like the following:
  Title: "Godzilla"
  Body:
  RX
  3 Rounds For Time:
  1 Legless Rope Climb (15 ft)
  2 Squat Snatches (225/145 lb)
  3 Back Squats (365/245 lb)
  4 Deficit Handstand Push-Ups (13/9 in)

  Scaled
  3 Rounds For Time:
  1 Rope Climb using legs (15 ft)
  2 Squat Snatches (155/105 lb)
  3 Back Squats (225/145 lb)
  4 Handstand Push-Ups

  RX+
  3 Rounds For Time:
  1 Legless Rope Climb (20 ft)
  2 Squat Snatches (245/165 lb)
  3 Back Squats (405/275 lb)
  4 Deficit Handstand Push-Ups (16/12 in)

  Strategy:

  Time Frame
  Intro: 0:00 - 3:00
  Warmup: 3:00 - 15:00
  Skill Work: 15:00 - 25:00 (Rope Climb and HSPU Specific Prep)
  Strength Prep: 25:00 - 34:00
  Workout: 34:00 - 54:00
  Cleanup/Cooldown: 54:00 - 57:00
  Mobility: 57:00 - 60:00

  TARGET SCORE

  * Target time: 14-16 minutes
  * Time cap: 20 minutes
  * Large Class Target Time: 16-18 minutes
  * Large Class Time Cap: 23 minutes

  STIMULUS and GOALS
  * Stimulus is high-intensity with a strong emphasis on strength endurance and skilled gymnastics. Each round should be approached with strategy and precision.
  * Main goal is to maintain efficiency and approachability on heavy lifts while tackling the gymnastic elements methodically to avoid fatigue-induced errors.

  WORKOUT STRATEGY & FLOW
  * Legless Rope Climb: Focus on using a strong, efficient pulling technique. Pinch the rope between your legs to help hold positions and avoid slipping. Common faults include relying solely on upper body strength without engaging legs efficiently, which can lead to early fatigue.
  * Squat Snatches: This will be the heaviest portion of the workout. Make sure to set up with a strong base and use hook grip. Maintain a straight bar path, keep chest up, and ensure you pull yourself under the bar quickly. Common faults are early arm bend and not getting full hip extension. Single reps with ample rest in between will be strategic for most athletes.
  * Back Squats: Set up quickly but with composure, ensuring safety with the heavy load. Engage core fully before descending to maintain a strong lumbar position. Breathing technique (inhale at the top, exhale at the top) will assist with maintaining tension. Common faults include collapsing chest and not hitting depth due to fatigue.
  * Deficit Handstand Push-Ups: Keep core tight and maintain a vertical line to prevent over-strain on shoulders. Lower under control and use forceful extension to break the deficit. Common faults include losing midline stability and over-arching the back. Breaking reps early into manageable sets will help avoid reaching muscle failure.
  * Coaches: Encourage athletes to fasten their belts correctly for the squats, use magnesium for better grip during rope climbs, and set up the HSPU stations properly. Monitor closely for form degradation due to fatigue.

  SCALING
  * The Scaling aim is for athletes to maintain the integrity of the movements while completing within the target time.

      * RX+ (Competitor):
      3 RFT:
      1 Legless Rope Climb (20 ft)
      2 Squat Snatches (245/165 lb)
      3 Back Squats (405/275 lb)
      4 Deficit Handstand Push-Ups (16/12 in)
      (KG conv: 111/74.5, 184/125, 435/216)

      * RX:
      3 RFT:
      1 Legless Rope Climb (15 ft)
      2 Squat Snatches (225/145 lb)
      3 Back Squats (365/245 lb)
      4 Deficit Handstand Push-Ups (13/9 in)
      (KG conv: 102/66, 166/111, 295/191)

      * Scaled:
      3 RFT:
      1 Rope Climb using legs (15 ft)
      2 Squat Snatches (155/105 lb)
      3 Back Squats (225/145 lb)
      4 Handstand Push-Ups (no deficit)
      (KG conv: 70/47, 102/66)

      * Limited Equipment or Beginner:
      3 RFT:
      6 Strict Pull-Ups
      6 Overhead Squats (light)
      6 Back Squats (light)
      6 Pike Push-Ups

      * Large Class:
      Teams of 2:
      3 RFT:
      2 Legless Rope Climbs
      4 Squat Snatches (245/165 lb)
      6 Back Squats (405/275 lb)
      8 Deficit Handstand Push-Ups (16/12 in)
      (KG conv: 111/74.5, 184/125, 435/216)
      One partner works at a time, sharing the reps equally.
  `;

  const { messages, submitPrompt } = useChatCompletion({
    model: 'gpt-4o',
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    temperature: 0.6,
  });

  useEffect(() => {
    loadSavedMetcons();
  }, []);

  const loadSavedMetcons = async () => {
    const { data, error } = await supabase
      .from('metcon')
      .select('*')
      .eq('program_id', params.programId)
      .order('generation_date', { ascending: false });

    if (error) {
      console.error('Error loading saved metcons:', error);
    } else {
      setSavedMetcons(data || []);
      if (data && data.length > 0) {
        setContent(data[0].generated_workout);
        setCurrentPage(0);
        setUnsavedChanges(false);
      }
    }
  };

  const saveMetcon = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('Error getting user:', userError);
      return;
    }

    const { data, error } = await supabase.from('metcon').insert({
      generated_workout: content,
      generation_date: new Date().toISOString(),
      program_id: params.programId,
      user_id: userData.user.id,
    });

    if (error) {
      console.error('Error saving metcon:', error);
    } else {
      setUnsavedChanges(false);
      loadSavedMetcons();
    }
  };

  const createEmbeddings = async (text) => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    });

    return response.data[0].embedding;
  };

  const matchWorkouts = async (embedding) => {
    const matchResult = await supabase.rpc('match_workouts', {
      query_embedding: embedding,
      match_threshold: 0.4,
      match_count: 20,
    });

    if (matchResult.error) {
      console.error('Error matching workouts:', matchResult.error);
      return [];
    }
    return matchResult.data;
  };

  const handleGenerateProgramming = async () => {
    setLoading(true);
    try {
      let internalWorkout,
        internalError,
        internalContent = '';

      if (whiteboard.internalWorkoutName) {
        ({ data: internalWorkout, error: internalError } = await supabase
          .from('internal_workouts')
          .select('parsed_text, embedding')
          .eq('user_id', user.data.user.id)
          .eq('file_name', whiteboard.internalWorkoutName)
          .limit(1)
          .single());

        if (internalError && internalError.code !== 'PGRST116') {
          throw internalError;
        }

        if (internalWorkout) {
          internalContent = `Internal workout: ${internalWorkout.parsed_text}`;
          setInternalWorkouts(internalContent);
        }
      }

      let matchedExternalWorkouts = [];
      if (internalWorkout) {
        const internalEmbedding = internalWorkout.embedding;
        matchedExternalWorkouts = await matchWorkouts(internalEmbedding);
      }

      let exampleWorkoutEmbedding,
        focusEmbeddings,
        matchedExampleWorkouts,
        matchedFocusWorkouts = [];
      if (whiteboard.exampleWorkout) {
        exampleWorkoutEmbedding = await createEmbeddings(
          whiteboard.exampleWorkout
        );
        matchedExampleWorkouts = await matchWorkouts(exampleWorkoutEmbedding);
      }
      if (whiteboard.focus) {
        focusEmbeddings = await createEmbeddings(whiteboard.focus);
        matchedFocusWorkouts = await matchWorkouts(focusEmbeddings);
      }

      const combinedWorkouts = [
        ...(internalContent ? [{ content: internalContent }] : []),
        ...matchedExampleWorkouts,
        ...matchedExternalWorkouts,
        ...matchedFocusWorkouts,
      ];
      setMatchedWorkouts(combinedWorkouts);
      const combinedWorkoutsText = combinedWorkouts
        .map((workout) => workout.content)
        .join('\n');

      const fullUserPrompt = `${userPrompt}\n\nUse the following workouts as references:\n${
        combinedWorkoutsText || 'No uploaded or example workouts provided'
      }`;

      const fullPrompt = [
        {
          content: fullUserPrompt,
          role: 'user',
        },
        {
          content: systemPrompt,
          role: 'system',
        },
      ];

      submitPrompt(fullPrompt);
    } catch (error) {
      console.error('Error generating programming:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role === 'assistant') {
        setContent(latestMessage.content);
        setUnsavedChanges(true);
      }
    }
  }, [messages]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setUnsavedChanges(true);
  };

  const goToNextPage = () => {
    if (currentPage + 1 < savedMetcons.length) {
      setCurrentPage(currentPage + 1);
      setContent(savedMetcons[currentPage + 1].generated_workout);
      setUnsavedChanges(false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      setContent(savedMetcons[currentPage - 1].generated_workout);
      setUnsavedChanges(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    doc.save('programming.pdf');
  };

  return (
    <div className="container mx-auto my-6 px-4">
      <h1 className="text-2xl font-bold mb-4">Metcon Programming Editor</h1>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0 mb-4">
        <ReviewDetails office={office} whiteboard={whiteboard} />
        <button
          className="btn btn-success text-white w-full sm:w-auto"
          onClick={handleGenerateProgramming}
        >
          Generate New Programming
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center my-4">
          <div className="flex flex-col gap-4 w-full sm:w-52">
            <div className="skeleton h-32 w-full"></div>
            <div className="skeleton h-4 w-28"></div>
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-full"></div>
          </div>
        </div>
      )}

      <div className="editor-container mt-6 bg-white shadow-lg rounded-lg p-6">
        <textarea
          ref={textAreaRef}
          className="w-full h-[60vh] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans text-base leading-relaxed"
          value={content}
          onChange={handleContentChange}
          style={{
            minHeight: '500px',
            lineHeight: '1.5',
            color: '#333',
            backgroundColor: '#fff',
          }}
        ></textarea>
        <div className="controls my-4 flex justify-between items-center">
          <div className="pagination-controls flex items-center">
            <button
              className="btn btn-primary mr-2"
              onClick={goToPreviousPage}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <span>{`${currentPage + 1} / ${savedMetcons.length}`}</span>
            <button
              className="btn btn-primary ml-2"
              onClick={goToNextPage}
              disabled={currentPage === savedMetcons.length - 1}
            >
              Next
            </button>
          </div>
          <div className="action-buttons">
            <button
              className="btn btn-primary text-white mr-2"
              onClick={saveMetcon}
              disabled={!unsavedChanges}
            >
              Save
            </button>
            <button
              className="btn btn-secondary text-white"
              onClick={downloadPDF}
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
