'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpen,
  Wand2,
  Search,
  Share2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Target,
  Calendar,
  RefreshCw,
  Play,
  Video,
  Trophy,
  Dumbbell,
  Users,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

const tutorials = [
  {
    id: 'program-wizard',
    title: 'Creating Programs with the Program Wizard',
    icon: Wand2,
    description: 'Learn how to create comprehensive training programs using our guided wizard.',
    content: {
      overview: 'The Program Wizard is a 5-step guided process that helps you create personalized training programs.',
      steps: [
        {
          step: 1,
          title: 'Training Methodology',
          description: 'Choose your training methodology (CrossFit, Bodybuilding, Powerlifting, etc.) and periodization model (Linear Progression, Undulating, Block, etc.)',
          location: '/program-wizard/step-1',
          features: [
            '12 different training methodologies available',
            '5 periodization models to choose from',
            'Each option includes detailed descriptions'
          ]
        },
        {
          step: 2,
          title: 'Program Description',
          description: 'Set your program name and write a detailed description of your gym\'s goals, member needs, and training focus',
          location: '/program-wizard/step-2',
          features: [
            'Custom program naming (pre-filled from dashboard)',
            'Detailed description requirements (min 50 characters)',
            'Example prompts for different program types',
            'Tips for effective program descriptions'
          ]
        },
        {
          step: 3,
          title: 'Previous Workouts',
          description: 'Share your gym\'s recent programming or search for reference workouts to inspire your new cycle',
          location: '/program-wizard/step-3',
          features: [
            'Upload previous workout logs and programming history',
            'AI-powered web search for reference workouts',
            'Select multiple reference workouts as inspiration',
            'Skip option for fresh programming cycles'
          ]
        },
        {
          step: 4,
          title: 'Gym Setup',
          description: 'Configure gym type, equipment, difficulty level, focus areas, and workout preferences',
          location: '/program-wizard/step-4',
          features: [
            '15 different gym types (CrossFit Box, Commercial Gym, Home Gym, etc.)',
            'Equipment presets based on gym type with custom adjustments',
            'Difficulty levels (Beginner, Intermediate, Advanced, Elite)',
            'Focus areas (Upper/Lower Body, Full Body, Core, etc.)',
            'Workout duration and format preferences'
          ]
        },
        {
          step: 5,
          title: 'Member/Class Metrics',
          description: 'Review and update metrics for your target members including performance benchmarks and considerations',
          location: '/program-wizard/step-5',
          features: [
            'Typical member stats (fitness levels, experience)',
            'Performance metrics (benchmark lifts, cardio capacity)',
            'Class size and scaling considerations',
            'Injury history and common limitations',
            'Imperial/Metric unit conversion',
            'Optional - can be updated after program creation'
          ]
        }
      ],
      tips: [
        'Take your time in Step 1 - the training methodology and periodization model significantly impact your program',
        'In Step 2, be detailed in your program description - this helps create better-targeted workouts',
        'Step 3 is optional but powerful - reference workouts help the AI understand your training style',
        'In Step 4, equipment selection is auto-populated based on gym type but can be fully customized to YOUR equipment',
        'Step 5 metrics are optional but help personalize the program intensity and progressions for your members'
      ]
    }
  },
  {
    id: 'program-editor',
    title: 'Editing and Regenerating Programs',
    icon: RefreshCw,
    description: 'Master the AI Program Writer for editing, regenerating, and customizing your training programs.',
    content: {
      overview: 'The AI Program Writer allows you to edit program details and regenerate workouts with full customization.',
      sections: [
        {
          title: 'Program Form Editing',
          description: 'Modify any aspect of your program including methodology, equipment, schedule, and personalization',
          features: [
            'Real-time auto-save of all changes',
            'Equipment selection with gym type presets',
            'Custom workout format creation',
            'Scheduling and date management'
          ],
          location: 'Left panel of the Program Writer'
        },
        {
          title: 'Workout Generation',
          description: 'Generate or regenerate workouts based on your current settings',
          features: [
            'Initial generation creates workouts from scratch',
            'Regeneration replaces existing workouts with new ones',
            'Confirmation dialogs prevent accidental overwrites',
            'Real-time generation progress tracking'
          ],
          process: [
            'Click "Generate Workouts" button',
            'Confirm generation in the modal dialog',
            'Watch progress through multiple stages',
            'Review generated workouts in the workout list'
          ]
        },
        {
          title: 'Workout Management',
          description: 'Edit, schedule, and manage individual workouts',
          features: [
            'View full workout details',
            'Edit workout titles and content',
            'Schedule workouts to specific dates',
            'Mark workouts as complete',
            'Delete unwanted workouts'
          ]
        }
      ],
      tips: [
        'Changes are auto-saved, but use the Save button for manual saves',
        'Regenerating will replace ALL current workouts - use with caution',
        'You can edit individual workouts without affecting the rest'
      ]
    }
  },
  {
    id: 'reference-workouts',
    title: 'Searching and Using Reference Workouts',
    icon: Search,
    description: 'Learn how to find and use reference workouts to improve your program generation.',
    content: {
      overview: 'Reference workouts help the AI understand your preferences and generate better, more targeted programs.',
      features: [
        {
          title: 'Search Functionality',
          description: 'Search through thousands of workouts using keywords, movements, or workout names',
          examples: [
            'Search "Fran" to find the famous CrossFit benchmark',
            'Search "EMOM" to find Every Minute on the Minute workouts',
            'Search "strength" to find strength-focused sessions'
          ]
        },
        {
          title: 'Workout Selection',
          description: 'Select multiple workouts that represent your training preferences',
          process: [
            'Enter search terms in the search bar',
            'Review workout details and tags',
            'Check the checkbox to select workouts',
            'Click "Add Selected" to add them to your program'
          ]
        },
        {
          title: 'Impact on Generation',
          description: 'Reference workouts guide the AI to generate similar styles and formats',
          benefits: [
            'More accurate workout styles',
            'Better movement selection',
            'Improved workout structure',
            'Consistent training methodology'
          ]
        }
      ],
      bestPractices: [
        'Select 3-5 reference workouts that represent your ideal training style',
        'Choose workouts from your preferred methodology (CrossFit, bodybuilding, etc.)',
        'Include variety - mix different workout types and intensities',
        'Review workout descriptions to ensure they match your goals'
      ],
      location: 'Access via "Search Reference Workouts" button in the Program Writer'
    }
  },
  {
    id: 'sharing',
    title: 'Sharing Programs and Workouts',
    icon: Share2,
    description: 'Learn how to share your programs and workouts publicly with others.',
    content: {
      overview: 'Share your training programs and individual workouts with the community through public links.',
      sharing: [
        {
          title: 'Program Sharing',
          description: 'Make your entire program publicly accessible',
          process: [
            'Navigate to your program',
            'Go to the "Share" section',
            'Toggle "Make this program public"',
            'Copy the public link to share with others'
          ],
          location: '/program/[programId]/share',
          features: [
            'Public link generation',
            'Privacy controls',
            'View-only access for public users',
            'Full program details visible'
          ]
        },
        {
          title: 'Workout Sharing',
          description: 'Share individual workouts from your programs',
          features: [
            'Generate public links for specific workouts',
            'Share workout details without full program access',
            'Perfect for sharing daily workouts'
          ]
        }
      ],
      benefits: [
        'Help others with similar training goals',
        'Build your reputation in the fitness community',
        'Get feedback on your programming',
        'Contribute to the workout database'
      ],
      privacy: [
        'Only shared items are public - other programs remain private',
        'You can revoke public access at any time',
        'Public viewers cannot edit your content'
      ]
    }
  },
  {
    id: 'enhancement',
    title: 'Enhancing Programs and Workouts',
    icon: Sparkles,
    description: 'Use AI to enhance and improve your existing programs and workouts.',
    content: {
      overview: 'Enhancement features use AI to improve your existing content based on specific instructions.',
      features: [
        {
          title: 'Program Enhancement',
          description: 'Improve all workouts in your program simultaneously',
          location: 'Available when viewing generated workouts in Program Writer',
          process: [
            'Click "Enhance Program" button',
            'Describe your desired improvements',
            'AI analyzes and enhances all workouts',
            'Review changes before saving'
          ],
          examples: [
            '"Add more CrossFit metcons"',
            '"Include more mobility work"',
            '"Make it more strength-focused"',
            '"Replace cardio with HIIT sessions"'
          ]
        },
        {
          title: 'Individual Workout Enhancement',
          description: 'Improve specific workouts with targeted modifications',
          access: 'Available in workout detail views and edit modals',
          capabilities: [
            'Adjust workout intensity',
            'Modify movement selection',
            'Change workout structure',
            'Add specific elements'
          ]
        }
      ],
      bestPractices: [
        'Be specific in your enhancement requests',
        'Review enhanced content before saving',
        'Use enhancement iteratively for best results',
        'Consider your equipment and skill level in requests'
      ]
    }
  },
  {
    id: 'athlete-management',
    title: 'Managing Athletes & Gym Invites',
    icon: Users,
    description: 'Learn how to invite athletes to your gym and manage their access.',
    content: {
      overview: 'HalteresAI connects coaches and athletes. Athletes join your gym with an invite code and get access to workouts, leaderboards, and AI feedback.',
      sections: [
        {
          title: 'Creating Invite Codes',
          description: 'Generate unique invite codes for your gym that athletes can use to join',
          features: [
            'Access invite codes from your gym settings',
            'Share codes via text, email, or post in your gym',
            'Codes link athletes to your gym automatically',
            'Athletes see only your gym\'s programming'
          ],
          location: 'Dashboard > Gym Settings'
        },
        {
          title: 'Athlete Onboarding',
          description: 'When athletes join, they go through a quick onboarding flow',
          features: [
            'Athletes set their display name',
            'Optional: Enter baseline metrics (1RMs, mile time)',
            'Immediately get access to today\'s workout',
            'Can update metrics anytime from their profile'
          ]
        },
        {
          title: 'Viewing Athlete Activity',
          description: 'See which athletes are engaging with your programming',
          features: [
            'View logged workout results',
            'See leaderboard standings',
            'Track athlete engagement over time',
            'Identify athletes who may need attention'
          ]
        }
      ],
      tips: [
        'Share your invite code during class announcements',
        'Post the code on your gym\'s whiteboard or member portal',
        'Encourage athletes to complete their profile for personalized feedback'
      ]
    }
  },
  {
    id: 'leaderboards',
    title: 'Understanding Gym Leaderboards',
    icon: Trophy,
    description: 'Learn how the points system and leaderboards work to motivate athletes.',
    content: {
      overview: 'Leaderboards gamify your gym experience. Athletes earn points for participating, and rankings update in real-time across weekly and monthly periods.',
      sections: [
        {
          title: 'How Points Work',
          description: 'Athletes earn points through various actions',
          features: [
            '1st Place: +10 points',
            '2nd Place: +7 points',
            '3rd Place: +5 points',
            'Logged Workout: +3 points',
            'Personal Record: +2 points',
            'RX Completion: +1 point'
          ]
        },
        {
          title: 'Leaderboard Types',
          description: 'Multiple leaderboard views keep competition fresh',
          features: [
            'By Workout: Rankings for each specific workout',
            'This Week: Aggregate points for the current week',
            'This Month: Aggregate points for the current month',
            'Points reset at the start of each period'
          ]
        },
        {
          title: 'Athlete Recognition',
          description: 'Athletes get recognized for their achievements',
          features: [
            'Medal badges for top 3 finishers',
            'PR badges when hitting personal records',
            'RX badges for completing workouts as prescribed',
            'Current user highlighting on the leaderboard'
          ]
        }
      ],
      tips: [
        'Announce weekly winners during class',
        'Encourage athletes to log all their workouts',
        'Use leaderboards to identify your most engaged athletes'
      ]
    }
  },
  {
    id: 'ai-feedback',
    title: 'AI Feedback System',
    icon: MessageSquare,
    description: 'Learn how the AI feedback loop improves programming and athlete insights.',
    content: {
      overview: 'HalteresAI learns from everyone. Coach feedback improves program generation. Athlete feedback improves personalized insights. The more you use it, the smarter it gets.',
      sections: [
        {
          title: 'Coach Feedback',
          description: 'Rate and comment on generated workouts to train the AI',
          features: [
            'Rate workouts after reviewing them',
            'Provide specific feedback on what you liked or didn\'t',
            'AI uses this to improve future generations',
            'Your preferences shape your gym\'s programming style'
          ],
          location: 'Program Writer > Generated Workouts'
        },
        {
          title: 'Athlete Feedback',
          description: 'Athletes can request AI insights after logging workouts',
          features: [
            'Available after logging workout results',
            'AI analyzes performance relative to history',
            'Provides personalized tips and observations',
            'Considers athlete\'s metrics and goals'
          ]
        },
        {
          title: 'Weekly Trends',
          description: 'Athletes see AI-generated insights about their progress',
          features: [
            'Analyzes workout patterns over time',
            'Identifies improvement areas',
            'Highlights achievements and PRs',
            'Updates weekly based on logged data'
          ]
        }
      ],
      tips: [
        'Encourage athletes to log detailed notes with their results',
        'Rate generated workouts even if they\'re good—positive feedback matters',
        'The AI gets smarter with consistent use over time'
      ]
    }
  },
  {
    id: 'athlete-app',
    title: 'Athlete Mobile App Guide',
    icon: Dumbbell,
    description: 'Help your athletes get the most out of the mobile app.',
    content: {
      overview: 'Athletes use the mobile app to access workouts, log results, check leaderboards, and track their progress. Share this guide with your members.',
      sections: [
        {
          title: 'Daily Workout View',
          description: 'Athletes see today\'s workout on their home screen',
          features: [
            'Today\'s workout displayed prominently',
            'Tap to view full workout details',
            'Log results directly from the workout view',
            'Access upcoming workouts in the calendar'
          ]
        },
        {
          title: 'Logging Results',
          description: 'Athletes record their performance after each workout',
          features: [
            'Enter time, reps, or weight as appropriate',
            'Mark as RX or scaled',
            'Add notes about the workout',
            'Request AI feedback after logging'
          ]
        },
        {
          title: 'Profile & Metrics',
          description: 'Athletes manage their personal data',
          features: [
            'Update display name',
            'Enter and update 1RM lifts',
            'Track body metrics (weight, height)',
            'View personal workout history'
          ]
        },
        {
          title: 'Leaderboard Access',
          description: 'Athletes compete and track standings',
          features: [
            'View workout-specific rankings',
            'Check weekly and monthly standings',
            'See points breakdown',
            'Celebrate top performers'
          ]
        }
      ],
      tips: [
        'Athletes should download the app from the App Store or Google Play',
        'Have athletes join using your gym\'s invite code',
        'Encourage profile completion for the best experience'
      ]
    }
  }
];

export default function TutorialsPage() {
  const { user } = useAuth();
  const [expandedTutorial, setExpandedTutorial] = useState(null);

  const toggleTutorial = (tutorialId) => {
    setExpandedTutorial(expandedTutorial === tutorialId ? null : tutorialId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Platform Tutorials
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Master the complete HalteresAI platform. Learn how to generate programming,
            manage athletes, use leaderboards, and leverage AI feedback to improve your gym.
          </p>
        </div>

        <div className="space-y-6">
          {tutorials.map((tutorial) => {
            const IconComponent = tutorial.icon;
            const isExpanded = expandedTutorial === tutorial.id;
            
            return (
              <div key={tutorial.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => toggleTutorial(tutorial.id)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tutorial.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {tutorial.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="pt-4">
                      <p className="text-gray-700 mb-6">
                        {tutorial.content.overview}
                      </p>

                      {/* Program Wizard specific content */}
                      {tutorial.id === 'program-wizard' && (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                              Wizard Steps
                            </h4>
                            <div className="space-y-4">
                              {tutorial.content.steps.map((step) => (
                                <div key={step.step} className="border rounded-lg p-4">
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                        {step.step}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="font-semibold text-gray-900 mb-1">
                                        {step.title}
                                      </h5>
                                      <p className="text-gray-600 text-sm mb-2">
                                        {step.description}
                                      </p>
                                      <ul className="text-sm text-gray-600 space-y-1">
                                        {step.features.map((feature, index) => (
                                          <li key={index} className="flex items-center space-x-2">
                                            <Target className="w-3 h-3 text-primary flex-shrink-0" />
                                            <span>{feature}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                              Pro Tips
                            </h4>
                            <div className="bg-blue-50 rounded-lg p-4">
                              <ul className="space-y-2">
                                {tutorial.content.tips.map((tip, index) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-blue-800">{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Program Editor specific content */}
                      {tutorial.id === 'program-editor' && (
                        <div className="space-y-6">
                          {tutorial.content.sections.map((section, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                {section.title}
                              </h4>
                              <p className="text-gray-600 text-sm mb-3">
                                {section.description}
                              </p>
                              {section.location && (
                                <p className="text-xs text-primary mb-3 font-medium">
                                  📍 {section.location}
                                </p>
                              )}
                              {section.features && (
                                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                                  {section.features.map((feature, fIndex) => (
                                    <li key={fIndex} className="flex items-center space-x-2">
                                      <Target className="w-3 h-3 text-primary flex-shrink-0" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {section.process && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">Process:</h5>
                                  <ol className="text-sm text-gray-600 space-y-1">
                                    {section.process.map((step, pIndex) => (
                                      <li key={pIndex} className="flex items-start space-x-2">
                                        <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                                          {pIndex + 1}
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                            </div>
                          ))}

                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                              Pro Tips
                            </h4>
                            <div className="bg-green-50 rounded-lg p-4">
                              <ul className="space-y-2">
                                {tutorial.content.tips.map((tip, index) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-green-800">{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Reference Workouts specific content */}
                      {tutorial.id === 'reference-workouts' && (
                        <div className="space-y-6">
                          {tutorial.content.features.map((feature, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                {feature.title}
                              </h4>
                              <p className="text-gray-600 text-sm mb-3">
                                {feature.description}
                              </p>
                              {feature.examples && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-gray-900 mb-2">Examples:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {feature.examples.map((example, eIndex) => (
                                      <li key={eIndex} className="flex items-center space-x-2">
                                        <Search className="w-3 h-3 text-primary flex-shrink-0" />
                                        <span>{example}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {feature.process && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-gray-900 mb-2">How to use:</h5>
                                  <ol className="text-sm text-gray-600 space-y-1">
                                    {feature.process.map((step, pIndex) => (
                                      <li key={pIndex} className="flex items-start space-x-2">
                                        <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                                          {pIndex + 1}
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              {feature.benefits && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2">Benefits:</h5>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {feature.benefits.map((benefit, bIndex) => (
                                      <li key={bIndex} className="flex items-center space-x-2">
                                        <Target className="w-3 h-3 text-green-500 flex-shrink-0" />
                                        <span>{benefit}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}

                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                              Best Practices
                            </h4>
                            <div className="bg-purple-50 rounded-lg p-4">
                              <ul className="space-y-2">
                                {tutorial.content.bestPractices.map((practice, index) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-purple-800">{practice}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">
                              <strong>Location:</strong> {tutorial.content.location}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Sharing specific content */}
                      {tutorial.id === 'sharing' && (
                        <div className="space-y-6">
                          {tutorial.content.sharing.map((shareType, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                {shareType.title}
                              </h4>
                              <p className="text-gray-600 text-sm mb-3">
                                {shareType.description}
                              </p>
                              {shareType.location && (
                                <p className="text-xs text-primary mb-3 font-medium">
                                  📍 {shareType.location}
                                </p>
                              )}
                              {shareType.process && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-gray-900 mb-2">How to share:</h5>
                                  <ol className="text-sm text-gray-600 space-y-1">
                                    {shareType.process.map((step, pIndex) => (
                                      <li key={pIndex} className="flex items-start space-x-2">
                                        <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                                          {pIndex + 1}
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              {shareType.features && (
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {shareType.features.map((feature, fIndex) => (
                                    <li key={fIndex} className="flex items-center space-x-2">
                                      <Target className="w-3 h-3 text-primary flex-shrink-0" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Benefits
                              </h4>
                              <div className="bg-green-50 rounded-lg p-4">
                                <ul className="space-y-2">
                                  {tutorial.content.benefits.map((benefit, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <Share2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                      <span className="text-sm text-green-800">{benefit}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Privacy & Control
                              </h4>
                              <div className="bg-blue-50 rounded-lg p-4">
                                <ul className="space-y-2">
                                  {tutorial.content.privacy.map((item, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                      <span className="text-sm text-blue-800">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhancement specific content */}
                      {tutorial.id === 'enhancement' && (
                        <div className="space-y-6">
                          {tutorial.content.features.map((feature, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                {feature.title}
                              </h4>
                              <p className="text-gray-600 text-sm mb-3">
                                {feature.description}
                              </p>
                              {feature.location && (
                                <p className="text-xs text-primary mb-3 font-medium">
                                  📍 {feature.location}
                                </p>
                              )}
                              {feature.access && (
                                <p className="text-xs text-green-600 mb-3 font-medium">
                                  🔓 {feature.access}
                                </p>
                              )}
                              {feature.process && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-gray-900 mb-2">Process:</h5>
                                  <ol className="text-sm text-gray-600 space-y-1">
                                    {feature.process.map((step, pIndex) => (
                                      <li key={pIndex} className="flex items-start space-x-2">
                                        <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                                          {pIndex + 1}
                                        </span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              {feature.examples && (
                                <div className="mb-3">
                                  <h5 className="font-medium text-gray-900 mb-2">Example requests:</h5>
                                  <div className="space-y-2">
                                    {feature.examples.map((example, eIndex) => (
                                      <div key={eIndex} className="bg-gray-100 rounded px-3 py-2">
                                        <code className="text-sm text-gray-800">{example}</code>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {feature.capabilities && (
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {feature.capabilities.map((capability, cIndex) => (
                                    <li key={cIndex} className="flex items-center space-x-2">
                                      <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                      <span>{capability}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}

                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                              Best Practices
                            </h4>
                            <div className="bg-yellow-50 rounded-lg p-4">
                              <ul className="space-y-2">
                                {tutorial.content.bestPractices.map((practice, index) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-sm text-yellow-800">{practice}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* Athlete & Gym Management tutorials - uses sections format */}
                      {['athlete-management', 'leaderboards', 'ai-feedback', 'athlete-app'].includes(tutorial.id) && (
                        <div className="space-y-6">
                          {tutorial.content.sections.map((section, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                {section.title}
                              </h4>
                              <p className="text-gray-600 text-sm mb-3">
                                {section.description}
                              </p>
                              {section.location && (
                                <p className="text-xs text-primary mb-3 font-medium">
                                  📍 {section.location}
                                </p>
                              )}
                              {section.features && (
                                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                                  {section.features.map((feature, fIndex) => (
                                    <li key={fIndex} className="flex items-center space-x-2">
                                      <Target className="w-3 h-3 text-primary flex-shrink-0" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}

                          {tutorial.content.tips && (
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Pro Tips
                              </h4>
                              <div className="bg-blue-50 rounded-lg p-4">
                                <ul className="space-y-2">
                                  {tutorial.content.tips.map((tip, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                      <span className="text-sm text-blue-800">{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick action buttons */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex flex-wrap gap-3">
                          {tutorial.id === 'program-wizard' && (
                            <a
                              href="/program-wizard"
                              className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              <Wand2 className="w-4 h-4 mr-2" />
                              Start Program Wizard
                            </a>
                          )}
                          {tutorial.id === 'program-editor' && user && (
                            <a
                              href="/dashboard"
                              className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Go to Dashboard
                            </a>
                          )}
                          {tutorial.id === 'reference-workouts' && user && (
                            <a
                              href="/dashboard"
                              className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Try Reference Search
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Video Tutorial Section */}
        <div className="mt-12 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg shadow-md overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Watch: Complete Halteres Overview
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Get a comprehensive walkthrough of all Halteres features in this detailed video tutorial. 
                Perfect for new users and those wanting to maximize their use of the platform.
              </p>
            </div>

            {/* Video Placeholder - Replace with actual video when available */}
            <div className="max-w-4xl mx-auto">
              <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
                {/* Video will go here */}
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-white/30 transition-colors">
                      <Play className="w-10 h-10 ml-1" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      How to Use Halteres: Complete Guide
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Coming soon - Comprehensive video walkthrough
                    </p>
                    <div className="text-sm text-gray-400">
                      Duration: ~15 minutes • Covers all major features
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Description */}
              <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  What You'll Learn
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Core Features</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <Target className="w-3 h-3 text-primary flex-shrink-0" />
                        <span>Setting up your first program with the wizard</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Target className="w-3 h-3 text-primary flex-shrink-0" />
                        <span>Using the AI Program Writer effectively</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Target className="w-3 h-3 text-primary flex-shrink-0" />
                        <span>Finding and using reference workouts</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Target className="w-3 h-3 text-primary flex-shrink-0" />
                        <span>Managing clients and programs</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Advanced Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center space-x-2">
                        <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        <span>Enhancing programs with AI suggestions</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        <span>Sharing programs publicly</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        <span>Best practices for program design</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        <span>Workflow optimization tips</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Coming Soon Notice */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Video className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">
                        Video Tutorial Coming Soon
                      </h4>
                      <p className="text-sm text-blue-700">
                        We're currently producing a comprehensive video guide that will walk you through 
                        all of Halteres' features. In the meantime, explore the detailed tutorials above 
                        for step-by-step written instructions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Need More Help?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Getting Started
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                New to the platform? Start with the Program Wizard tutorial and work your way through the basics.
              </p>
              <a
                href="/program-wizard"
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Start Your First Program →
              </a>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Contact Support
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Have questions not covered in these tutorials? We're here to help.
              </p>
              <a
                href="/contact"
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                Get in Touch →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}