import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const supabaseClient = await createClient();
  const requestBody = await request.json();
  const {
    searchQuery,
    goal,
    duration,
    difficulty,
    equipment,
    focusArea,
    additionalNotes,
    personalization,
    workoutFormats,
    quirks,
    exampleWorkout,
    gymType,
  } = requestBody;

  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Construct the web search query from the provided parameters
  const webSearchQuery = `Find workouts related to: ${searchQuery || ''} 
Goal: ${goal}
Duration: ${duration} minutes
Difficulty: ${difficulty}
${focusArea ? `Focus Area: ${focusArea}` : ''}
${
  equipment && equipment.length > 0
    ? `Available Equipment: ${equipment.join(', ')}`
    : ''
}
${
  workoutFormats && workoutFormats.length > 0
    ? `Workout Formats to Include: ${workoutFormats.join(', ')}`
    : ''
}
${gymType ? `Gym Type: ${gymType}` : ''}
${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}
${personalization ? `Personalization: ${personalization}` : ''}
${quirks ? `Special Coaching Style: ${quirks}` : ''}
${
  exampleWorkout
    ? `Use this workout as a reference for style and format:
${exampleWorkout}`
    : ''
}`;

  try {
    // Perform web search for workout information
    const webSearchResponse = await openAiClient.chat.completions.create({
      model: 'gpt-4o-search-preview',
      web_search_options: {},
      messages: [
        {
          role: 'system',
          content: `You are an expert fitness researcher specializing in finding complete, actionable workouts. 

SEARCH STRATEGY:
- Prioritize these authoritative sources: crossfit.com/workout, wodwell.com, wodprep.com, crossfit.com/at-home/workouts, crossfitsouthbrooklyn.com/blog/, strongapp.com, strongerbyscience.com, athleanx.com, jefit.com, bodybuilding.com, menshealth.com, womenshealthmag.com, shape.com, self.com, fitnessblender.com, powerlifting.com, elitefts.com, juggernauttraining.com, kabukistrength.com, muscleandstrength.com, tigerfitness.com, muscleandperformance.com, freeletics.com, darebee.com, neilarey.com, calisthenic-workout.com, gmb.io, runnersworld.com, active.com, mapmyrun.com, coolrunning.com, doyogawithme.com, yogajournal.com, alo.com/wellness, beachbodyondemand.com, popsugar.com/fitness, stack.com, vertimax.com, onnit.com/academy, trainingpeaks.com, kettlebellkings.com, roguefitness.com/theindex, concept2.com/training, renaissanceperiodization.com, 3dmusclejourney.com, precisenutrition.com, examine.com
- Look for complete workout programs, not just exercise descriptions
- Search for variations of the user's query (synonyms, different formats)
- Include both beginner and advanced versions when available

REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON array. Each workout object must have:
{
  "title": "Exact workout name",
  "body": "COMPLETE workout details including: exercises, sets, reps, weights/loads, rest periods, tempo, progression notes, and any special instructions. This must be the full workout, not a summary.",
  "source": "Full URL where found",
  "tags": ["relevant", "tags", "like", "strength", "cardio", "beginner"],
  "difficulty": "beginner|intermediate|advanced",
  "duration": "estimated time in minutes",
  "equipment": ["list", "of", "required", "equipment"]
}

CRITICAL REQUIREMENTS:
- The "body" field must contain the COMPLETE workout that someone could follow step-by-step
- Include exact rep schemes, set counts, and rest periods
- If weights are mentioned, include them
- Include warm-up and cool-down if provided
- Do not summarize - include full details
- Minimum 3 workouts, maximum 8 workouts
- Only include workouts that have complete programming details`,
        },
        {
          role: 'user',
          content: `Find complete workouts for: ${webSearchQuery}`,
        },
      ],
    });

    const webWorkoutsContent = webSearchResponse.choices[0].message.content;

    // Parse the response to extract structured workout data
    let workouts = [];
    try {
      // Look for JSON in the response
      const jsonMatch =
        webWorkoutsContent.match(/```json([\s\S]*?)```/) ||
        webWorkoutsContent.match(/\[([\s\S]*?)\]/) ||
        webWorkoutsContent.match(/\{([\s\S]*?)\}/);

      if (jsonMatch) {
        const jsonContent = jsonMatch[0].replace(/```json|```/g, '');
        workouts = JSON.parse(jsonContent);

        // If workouts is an object with a workouts array, extract it
        if (
          !Array.isArray(workouts) &&
          workouts.workouts &&
          Array.isArray(workouts.workouts)
        ) {
          workouts = workouts.workouts;
        }

        // Ensure workouts is an array before proceeding
        if (!Array.isArray(workouts)) {
          // If parsing resulted in a single object, wrap it in an array
          if (
            typeof workouts === 'object' &&
            workouts !== null &&
            !Array.isArray(workouts)
          ) {
            // Check if it's the structure { workouts: [...] }
            if (workouts.workouts && Array.isArray(workouts.workouts)) {
              workouts = workouts.workouts;
            } else {
              workouts = [workouts];
            }
          } else {
            // If parsing failed to produce a usable structure, log and potentially create a default
            console.error(
              'Workouts variable is not an array or expected object after parsing/fallback, initializing as empty array.'
            );
            workouts = [];
          }
        }

        // Check each workout body and generate if it's just a description
        const processedWorkouts = []; // Use a new array to avoid async issues in loop
        for (const workout of workouts) {
          let currentWorkout = { ...workout }; // Clone workout object

          if (
            currentWorkout &&
            typeof currentWorkout.body === 'string' &&
            currentWorkout.body.trim().length > 0
          ) {
            try {
              // Ask gpt-4.1 to classify the body content
              const classificationResponse =
                await openAiClient.chat.completions.create({
                  model: 'gpt-4',
                  messages: [
                    {
                      role: 'user',
                      content: `Text: \`\`\`${currentWorkout.body}\`\`\``,
                    },
                  ],
                });
              const classification =
                classificationResponse.choices[0].message.content
                  ?.trim()
                  .toUpperCase();

              if (classification === 'DESCRIPTION') {
                console.log(
                  `Workout body for \"${
                    currentWorkout.title || 'Untitled'
                  }\" identified as description. Generating plan...`
                );
                // If it's a description, generate a workout plan
                const generationResponse =
                  await openAiClient.chat.completions.create({
                    model: 'gpt-4', // Or potentially a stronger model if generation quality is low
                    messages: [
                      {
                        role: 'system',
                        content: `You are a helpful fitness assistant. Based on the title, tags, and description below, generate a plausible, detailed workout plan. Include specific sets, reps, movements, weights (if applicable), and rest periods. Format the workout clearly. Structure it section by section (e.g., Warm-up, Workout, Cool-down).\n\nTitle: ${
                          currentWorkout.title || 'Untitled'
                        }\nTags: ${(currentWorkout.tags || []).join(
                          ', '
                        )}\nDescription: \`\`\`${
                          currentWorkout.body
                        }\`\`\`\n\nGenerated Workout Plan:`,
                      },
                    ],
                  });
                const generatedPlan =
                  generationResponse.choices[0].message.content?.trim();
                if (generatedPlan) {
                  currentWorkout.body = generatedPlan; // Replace description with generated plan
                  console.log(
                    `Generated plan for \"${
                      currentWorkout.title || 'Untitled'
                    }\":\n${generatedPlan}`
                  );
                } else {
                  console.log(
                    `Generation failed for \"${
                      currentWorkout.title || 'Untitled'
                    }\", keeping original body.`
                  );
                }
              } else {
                console.log(
                  `Workout body for \"${
                    currentWorkout.title || 'Untitled'
                  }\" classified as PLAN.`
                );
              }
            } catch (classificationError) {
              console.error(
                `Error classifying or generating workout body for \"${
                  currentWorkout.title || 'Untitled'
                }\":`,
                classificationError
              );
              // Keep the original body on error
            }
          } else {
            // Handle cases where body is missing or not a string
            console.log(
              `Workout \"${
                currentWorkout.title || 'Untitled'
              }\" has missing or invalid body, skipping generation.`
            );
            if (!currentWorkout.body)
              currentWorkout.body = 'Workout details not available.'; // Provide a default
          }
          processedWorkouts.push(currentWorkout);
        }
        // Assign the processed workouts back
        workouts = processedWorkouts;
      } else {
        // If no JSON found, have OpenAI format the response
        const formattingResponse = await openAiClient.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'Your task is to convert the following workout information into structured JSON. Format it as an array of workout objects, with each object having title, body, source, and tags fields. The "body" field MUST contain the full workout details (sets, reps, movements, rest periods, etc.), not just a summary.',
            },
            {
              role: 'user',
              content: webWorkoutsContent,
            },
          ],
        });

        const formattedContent = formattingResponse.choices[0].message.content;
        const jsonMatch =
          formattedContent.match(/```json([\s\S]*?)```/) ||
          formattedContent.match(/\[([\s\S]*?)\]/) ||
          formattedContent.match(/\{([\s\S]*?)\}/);

        if (jsonMatch) {
          const jsonContent = jsonMatch[0].replace(/```json|```/g, '');
          workouts = JSON.parse(jsonContent);

          // If workouts is an object with a workouts array, extract it
          if (
            !Array.isArray(workouts) &&
            workouts.workouts &&
            Array.isArray(workouts.workouts)
          ) {
            workouts = workouts.workouts;
          }

          // Ensure workouts is an array before proceeding
          if (!Array.isArray(workouts)) {
            // If parsing resulted in a single object, wrap it in an array
            if (
              typeof workouts === 'object' &&
              workouts !== null &&
              !Array.isArray(workouts)
            ) {
              // Check if it's the structure { workouts: [...] }
              if (workouts.workouts && Array.isArray(workouts.workouts)) {
                workouts = workouts.workouts;
              } else {
                workouts = [workouts];
              }
            } else {
              // If parsing failed to produce a usable structure, log and potentially create a default
              console.error(
                'Workouts variable is not an array or expected object after parsing/fallback, initializing as empty array.'
              );
              workouts = [];
            }
          }

          // Check each workout body and generate if it's just a description
          const processedWorkouts = []; // Use a new array to avoid async issues in loop
          for (const workout of workouts) {
            let currentWorkout = { ...workout }; // Clone workout object

            if (
              currentWorkout &&
              typeof currentWorkout.body === 'string' &&
              currentWorkout.body.trim().length > 0
            ) {
              try {
                // Ask gpt-4.1 to classify the body content
                const classificationResponse =
                  await openAiClient.chat.completions.create({
                    model: 'gpt-4',
                    messages: [
                      {
                        role: 'user',
                        content: `Analyze the following workout body. Does it contain specific workout instructions (like sets, reps, time domains, specific movements listed in a sequence), or is it just a general summary or description? Respond ONLY with 'PLAN' if it has specific instructions, or 'DESCRIPTION' if it's just a summary.\n\nText: \`\`\`${currentWorkout.body}\`\`\``,
                      },
                    ],
                  });
                const classification =
                  classificationResponse.choices[0].message.content
                    ?.trim()
                    .toUpperCase();

                if (classification === 'DESCRIPTION') {
                  console.log(
                    `Workout body for \"${
                      currentWorkout.title || 'Untitled'
                    }\" identified as description. Generating plan...`
                  );
                  // If it's a description, generate a workout plan
                  const generationResponse =
                    await openAiClient.chat.completions.create({
                      model: 'gpt-4', // Or potentially a stronger model if generation quality is low
                      messages: [
                        {
                          role: 'system',
                          content: `You are a helpful fitness assistant. Based on the title, tags, and description below, generate a plausible, detailed workout plan. Include specific sets, reps, movements, weights (if applicable), and rest periods. Format the workout clearly. Structure it section by section (e.g., Warm-up, Workout, Cool-down).\n\nTitle: ${
                            currentWorkout.title || 'Untitled'
                          }\nTags: ${(currentWorkout.tags || []).join(
                            ', '
                          )}\nDescription: \`\`\`${
                            currentWorkout.body
                          }\`\`\`\n\nGenerated Workout Plan:`,
                        },
                      ],
                    });
                  const generatedPlan =
                    generationResponse.choices[0].message.content?.trim();
                  if (generatedPlan) {
                    currentWorkout.body = generatedPlan; // Replace description with generated plan
                    console.log(
                      `Generated plan for \"${
                        currentWorkout.title || 'Untitled'
                      }\":\n${generatedPlan}`
                    );
                  } else {
                    console.log(
                      `Generation failed for \"${
                        currentWorkout.title || 'Untitled'
                      }\", keeping original body.`
                    );
                  }
                } else {
                  console.log(
                    `Workout body for \"${
                      currentWorkout.title || 'Untitled'
                    }\" classified as PLAN.`
                  );
                }
              } catch (classificationError) {
                console.error(
                  `Error classifying or generating workout body for \"${
                    currentWorkout.title || 'Untitled'
                  }\":`,
                  classificationError
                );
                // Keep the original body on error
              }
            } else {
              // Handle cases where body is missing or not a string
              console.log(
                `Workout \"${
                  currentWorkout.title || 'Untitled'
                }\" has missing or invalid body, skipping generation.`
              );
              if (!currentWorkout.body)
                currentWorkout.body = 'Workout details not available.'; // Provide a default
            }
            processedWorkouts.push(currentWorkout);
          }
          // Assign the processed workouts back
          workouts = processedWorkouts;
        }
      }
    } catch (error) {
      console.error('Error parsing workout data:', error);
      // Fallback to returning the raw content
      workouts = [
        {
          title: 'Web Search Results',
          body: webWorkoutsContent,
          source: 'Web Search',
          tags: [goal, difficulty, focusArea].filter(Boolean),
        },
      ];
    }

    // Ensure each workout has the required fields
    workouts = workouts.map((workout) => ({
      title: workout.title || 'Untitled Workout',
      body: workout.body || workout.description || workout.content || '',
      source: workout.source || workout.url || 'Web Search',
      tags: workout.tags || [goal, difficulty, focusArea].filter(Boolean),
    }));

    return NextResponse.json({
      workouts: workouts,
    });
  } catch (error) {
    console.error('Error performing web search:', error);
    return NextResponse.json(
      { error: 'Failed to perform web search for workouts' },
      { status: 500 }
    );
  }
}
