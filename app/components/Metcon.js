'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOfficeContext } from '@/contexts/OfficeContext';
import OpenAI from 'openai';
import jsPDF from 'jspdf';
import ReviewDetails from '@/components/ReviewDetails';
import { useChatCompletion } from '@/hooks/useOpenAiStream/chat-hook';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

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
  } for the next ${whiteboard.programLength} days. The user is a ${
    whiteboard.personalization
  } and the gym they own has the following details and they'd like to create a plan based on the provided information. The gym is equipped with the following equipment: ${
    office?.equipmentList
  }. The coaching staff has the following experience: ${
    office?.coachList?.length
      ? office?.coachList.map((coach) => coach.experience).join(', ')
      : "the coaching staff wasn't listed"
  }. The class schedule is as follows: ${
    office?.classSchedule
  }. The class duration is ${office?.classDuration}. The workout format is ${
    whiteboard.workoutFormat
  }. The workout cycle length is ${
    whiteboard.programLength
  }. The workout focus is ${
    whiteboard.focus
  }. Please use the example workout and uploaded workout (if they've provided them) they've provided as the leading influencers in your writing: Example workout: ${
    whiteboard.exampleWorkout
  }, and uploaded workout: ${
    matchedWorkouts.length
      ? matchedWorkouts.map((workout) => workout.content).join(', ')
      : 'No uploaded workout provided'
  }.`;

  const systemPrompt = `
Based on the provided gym information, create a detailed ${whiteboard.programLength} workout plan and program. Make sure to write an intro to the program detailing what the program will focus on. Include workouts for each day based on the ${whiteboard.programLength}, tailored to the available equipment and coaching expertise. Specify exact workouts, without suggesting repetitions of previous workouts or scaling instructions. Include coaches notes and suggestions for each strength and conditioning workout. Provide scaled, RX, and compete weight and movement options, as well as making sure to provide female and male weight and movement options. Include specific stretches and cool down movements if the user asks for it in the workout format. Focus on listing unique and specific workouts for each day of the ${whiteboard.programLength}. Most importantly tailor the workouts to the user's profession as a ${whiteboard.personalization} AND make sure the provided template workout and/or internal workouts as the leading influences for the workouts you generate. Make sure to ONLY generate the number of workouts they ask for in the workout cycle length e.g ${whiteboard.programLength} days. Finally, integrate the matched external workouts as references. `;

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
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  };

  const matchWorkouts = async (embedding) => {
    const matchResult = await supabase.rpc('match_external_workouts', {
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
        matchedExampleWorkouts = [];
      if (whiteboard.exampleWorkout) {
        exampleWorkoutEmbedding = await createEmbeddings(
          whiteboard.exampleWorkout
        );
        matchedExampleWorkouts = await matchWorkouts(exampleWorkoutEmbedding);
      }

      const combinedWorkouts = [
        ...(internalContent ? [{ content: internalContent }] : []),
        ...matchedExampleWorkouts,
        ...matchedExternalWorkouts,
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
