'use client';

import React, { useState, useEffect } from 'react';
import { useOfficeContext } from '../contexts/OfficeContext';
import { useChatCompletion } from '../hooks/useOpenAiStream/chat-hook';

const OPEN_AI_API_KEY = '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';

export default function Metcon() {
  const { office, whiteboard } = useOfficeContext();
  const [loading, setLoading] = useState(false);
  const userPrompt = `
  Based on the provided gym information, create a detailed ${whiteboard.cycleLength} CrossFit workout plan. Include workouts for each day, tailored to the available equipment and coaching expertise. Specify exact workouts, including scaled and RX weights for each exercise, without suggesting repetitions of previous workouts or scaling instructions. Focus solely on listing unique and specific workouts for each day of the ${whiteboard.cycleLength}.
  Here are the included details: 
  - Gym Equipment: ${office.equipment}, 
  - Coaching staff: ${office.coachInfo}, 
  - Class Schedule: ${office.classSchedule}, 
  - Class duration: ${office.classDuration}, 
  - Workout format: ${whiteboard.workoutFormat}, 
  - Workout cycle length: ${whiteboard.cycleLength}, 
  - Workout focus: ${whiteboard.focus}, 
  - Template workout: ${whiteboard.exampleWorkout};
  `;

  const prompt = [
    {
      content: userPrompt,
      role: 'user',
    },
  ];

  const { messages, submitPrompt } = useChatCompletion({
    model: 'gpt-3.5-turbo',
    apiKey: OPEN_AI_API_KEY,
    temperature: 0.9,
  });

  const handleGenerateProgramming = () => {
    setLoading(true);
    submitPrompt(prompt);
    console.log(messages);
    setLoading(false);
  };

  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, [messages]);

  return (
    <div className="container mx-auto my-6">
      <h1 className="text-2xl font-bold">Metcon</h1>
      <div>
        <h2 className="text-xl">Office Details</h2>
        <p>{JSON.stringify(office)}</p>
      </div>
      <div>
        <h2 className="text-xl">Whiteboard Details</h2>
        <p>{JSON.stringify(whiteboard)}</p>
      </div>
      <button
        className="btn btn-primary mt-4"
        onClick={handleGenerateProgramming}
      >
        Generate Programming
      </button>
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
                  <div className="role">Role: {msg.role}</div>
                  <pre className="chat-message">{msg.content}</pre>
                  {!msg.meta.loading && (
                    <div className="tag-wrapper">
                      {msg.role === 'assistant' && (
                        <>
                          <span className="tag">
                            Tokens: {msg.meta.chunks.length}
                          </span>
                          <span className="tag">
                            Response time: {msg.meta.responseTime}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
