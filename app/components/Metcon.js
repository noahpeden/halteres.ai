'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOfficeContext } from '@/contexts/OfficeContext';
import OpenAI from 'openai';
import jsPDF from 'jspdf';
import ReviewDetails from '@/components/ReviewDetails';
import { useChatCompletion } from '@/hooks/useOpenAiStream/chat-hook';
import { useAuth } from '@/contexts/AuthContext';

export default function Metcon({ params }) {
  const { supabase } = useAuth();
  const { office, whiteboard, readyForQuery } = useOfficeContext();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [assistantMessages, setAssistantMessages] = useState([]);
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
  }.  The class schedule is as follows: ${
    office?.classSchedule
  }. The class duration is ${office?.classDuration}. The workout format is ${
    whiteboard.workoutFormat
  }. The workout cycle length is ${
    whiteboard.programLength
  }. The workout focus is ${
    whiteboard.focus
  }. Please use the example workout they've provided as the leading influencer in your writing: ${
    whiteboard.exampleWorkout
  }.`;

  const prompt = [
    {
      content: userPrompt,
      role: 'user',
    },
    {
      content: `
        Based on the provided gym information, create a detailed ${whiteboard.programLength} workout plan. Include workouts for each day based on the ${whiteboard.programLength}, tailored to the available equipment and coaching expertise. Specify exact workouts, without suggesting repetitions of previous workouts or scaling instructions. Focus solely on listing unique and specific workouts for each day of the ${whiteboard.programLength}. Most importantly tailor the workouts to the user's profession as a ${whiteboard.personalization} AND make sure the provided template workout is the leading influence for the workouts you generate. Make sure to ONLY generate the number of workouts they ask for in the workout cycle length e.g ${whiteboard.programLength} days. `,
      role: 'system',
    },
  ];

  const { messages, submitPrompt } = useChatCompletion({
    model: 'gpt-3.5-turbo',
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

    if (searchedWorkoutsResult.error) {
      console.error('Error matching workouts:', searchedWorkoutsResult.error);
    } else {
      setmatchedWorkouts(searchedWorkoutsResult.data);
    }
  }

  useEffect(() => {
    if (
      readyForQuery &&
      whiteboard.personalization === 'Crossfit Coach or Owner'
    ) {
      createEmbeddings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyForQuery]);

  useEffect(() => {
    messages.length < 1
      ? setContent('No messages yet')
      : setContent(messages.map((msg) => msg.content).join('\n'));
  }, [messages]);

  const goToNextPage = () => {
    setCurrentPage((prev) =>
      prev + 1 < assistantMessages.length ? prev + 1 : prev
    );
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : 0));
  };

  useEffect(() => {
    if (messages.length < 1) {
      setContent('No messages yet');
    } else {
      const filteredMessages = messages.filter(
        (msg) => msg.role === 'assistant'
      );
      setAssistantMessages(filteredMessages);
      setContent(filteredMessages[currentPage]?.content || 'No messages yet');
    }
  }, [messages, currentPage]);

  const handleGenerateProgramming = () => {
    setLoading(true);
    submitPrompt(prompt);
    setLoading(false);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    doc.save('programming.pdf');
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
        <div className="pagination-controls my-4">
          <button
            className="btn btn-primary mr-2"
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <button
            className="btn btn-primary"
            onClick={goToNextPage}
            disabled={currentPage === assistantMessages.length - 1}
          >
            Next
          </button>
        </div>
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
