'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOfficeContext } from '@/contexts/OfficeContext';
import { useChatCompletion } from '@/hooks/useOpenAiStream/chat-hook';
import OpenAI from 'openai';
import jsPDF from 'jspdf';
import ReviewDetails from '@/components/ReviewDetails';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ProgramLength from './ProgramLength';

export default function Metcon() {
  const supabase = createClientComponentClient();

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    doc.save('programming.pdf');
  };
  const textAreaRef = useRef(null);

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  const { office, whiteboard, readyForQuery } = useOfficeContext();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [matchedWorkouts, setmatchedWorkouts] = useState([]);
  const userPrompt = `
  Based on the provided gym information, create a detailed ${
    whiteboard.cycleLength
  } CrossFit workout plan. Include workouts for each day, tailored to the available equipment and coaching expertise. Specify exact workouts, including scaled and RX weights for each exercise, without suggesting repetitions of previous workouts or scaling instructions. Focus solely on listing unique and specific workouts for each day of the ${
    whiteboard.cycleLength
  }.
  Here are the included details:
  - Gym Equipment: ${office.equipmentList},
  - Coaching staff: ${office.coachList
    .map((coach) => coach.experience)
    .join(', ')},
  - Class Schedule: ${office.classSchedule},
  - Class duration: ${office.classDuration},
  - Workout format: ${whiteboard.workoutFormat},
  - Workout cycle length: ${whiteboard.cycleLength},
  - Workout focus: ${whiteboard.focus},
  - Template workout: ${whiteboard.exampleWorkout};
  - Use these workouts as inspiration: ${matchedWorkouts
    .map((workout) => workout.body)
    .join(', ')}
  `;

  const prompt = [
    {
      content: userPrompt,
      role: 'user',
    },
  ];

  const { messages, submitPrompt } = useChatCompletion({
    model: 'gpt-4-0125-preview',
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    temperature: 0.9,
  });

  const embeddingPrompt = whiteboard.exampleWorkout;

  async function createEmbeddings() {
    const openaiResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingPrompt,
      encoding_format: 'float',
    });

    const embeddingVector = openaiResponse.data[0].embedding;
    const searchedWorkoutsResult = await supabase.rpc(
      'match_external_workouts',
      {
        query_embedding: embeddingVector,
        match_threshold: 0.4,
        match_count: 20,
      }
    );

    console.log(searchedWorkoutsResult);
    if (searchedWorkoutsResult.error) {
      console.error('Error matching workouts:', searchedWorkoutsResult.error);
    } else {
      console.log('Matched Workouts:', searchedWorkoutsResult.data);
      setmatchedWorkouts(searchedWorkoutsResult.data);
    }
  }

  useEffect(() => {
    if (readyForQuery) {
      createEmbeddings();
    }
  }, [readyForQuery]);

  useEffect(() => {
    messages.length < 1
      ? setContent('No messages yet')
      : setContent(messages.map((msg) => msg.content).join('\n'));
  }, [messages]);

  const handleGenerateProgramming = () => {
    setLoading(true);
    submitPrompt(prompt);
    setLoading(false);
  };

  return (
    <div className="container mx-auto my-6">
      <h1 className="text-2xl font-bold">Metcon Programming Editor</h1>
      <div className="flex align-center justify-between">
        <ReviewDetails office={office} whiteboard={whiteboard} />
        <button
          className="btn btn-success text-white mt-4"
          onClick={handleGenerateProgramming}
        >
          Generate Programming
        </button>
      </div>
      <div>
        {loading && (
          <div className="flex justify-center items-center">
            <div className="flex flex-col gap-4 w-52">
              <div className="skeleton h-32 w-full"></div>
              <div className="skeleton h-4 w-28"></div>
              <div className="skeleton h-4 w-full"></div>
              <div className="skeleton h-4 w-full"></div>
            </div>
          </div>
        )}
      </div>

      <div className="editor-container p-4">
        <textarea
          ref={textAreaRef}
          className="textarea textarea-bordered w-full h-96"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        <button
          className="btn btn-primary text-white mt-4"
          onClick={downloadPDF}
        >
          Download as PDF
        </button>
      </div>
    </div>
  );
}
