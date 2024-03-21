'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOfficeContext } from '@/contexts/OfficeContext';
import { useChatCompletion } from '@/hooks/useOpenAiStream/chat-hook';
import OpenAI from 'openai';
import jsPDF from 'jspdf';
import { useAuth } from '@/contexts/AuthContext';

export default function Metcon() {
  const { supabase } = useAuth();

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
  - Coaching staff: ${office.coachList}, 
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
      <div className="review-details">
        <h2 className="text-xl">Review Details</h2>

        <div>
          <h3 className="text-lg font-semibold">Office Details</h3>
          <ul>
            <li>
              Equipment List:
              <ul>
                {office?.equipmentList?.map((item, index) => (
                  <li key={index}>
                    {item.quantity}x {item.name}
                  </li>
                ))}
              </ul>
            </li>
            <li>
              Coaching Staff:
              <ul>
                {office?.coachList?.map((coach, index) => (
                  <li key={index}>
                    {coach.name} - {coach.experience}
                  </li>
                ))}
              </ul>
            </li>
            <li>Class Schedule: {office.classSchedule}</li>
            <li>Class Duration: {office.classDuration}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-semibold">Whiteboard Details</h3>
          <ul>
            <li>Cycle Length: {whiteboard.cycleLength}</li>
            <li>Workout Format: {whiteboard.workoutFormat}</li>
            <li>Focus: {whiteboard.focus}</li>
            <li>Example Workout: {whiteboard.exampleWorkout}</li>
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">
          Matched workouts we'll use for RAG
        </h3>
        <ul>
          {matchedWorkouts?.map((workout, index) => (
            <li key={index}>{workout.body}</li>
          ))}
        </ul>
        {loading ? (
          <div className="flex justify-center items-center">
            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
              {/* SVG for circular loading indicator */}
            </svg>
          </div>
        ) : (
          <div>
            <h2 className="text-xl mt-4">Generated Programming</h2>
            <div className="chat-wrapper">
              {messages.length < 1 ? (
                <div className="empty">No messages</div>
              ) : (
                messages.map((msg, i) => (
                  <div className="message-wrapper" key={i}>
                    <pre className="chat-message">{msg.content}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <button
        className="btn btn-secondary mt-4"
        onClick={handleGenerateProgramming}
      >
        Generate Programming
      </button>
      <div className="editor-container p-4">
        <textarea
          ref={textAreaRef}
          className="textarea textarea-bordered w-full h-screen"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>
        <button className="btn btn-success mt-4" onClick={downloadPDF}>
          Download as PDF
        </button>
      </div>
    </div>
  );
}
