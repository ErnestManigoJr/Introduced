export interface DatingPreferenceQuestion {
  key: string;
  prompt: string;
  type: 'single' | 'multi' | 'range';
  options?: { key: string; label: string }[];
}

export const DATING_PREFERENCE_QUESTIONS: DatingPreferenceQuestion[] = [
  {
    key: 'open_to_now',
    prompt: 'What are you open to right now?',
    type: 'single',
    options: [
      { key: 'friendship', label: 'Building a real friendship first' },
      { key: 'dating', label: 'Dating and seeing where it goes' },
      { key: 'relationship', label: 'A committed relationship' },
      { key: 'both', label: 'Open to friendship or dating' },
      { key: 'not_sure', label: "I'm not sure yet" },
    ],
  },
  {
    key: 'relationship_pace',
    prompt: 'What relationship pace feels right to you?',
    type: 'single',
    options: [
      { key: 'slow', label: 'Slow and intentional — I like to build a foundation' },
      { key: 'natural', label: 'Natural — wherever it flows' },
      { key: 'steady', label: 'Steady — consistent effort from both sides' },
      { key: 'direct', label: 'Direct — I know what I want' },
    ],
  },
  {
    key: 'non_negotiables',
    prompt: 'What are your non-negotiables in a connection?',
    type: 'multi',
    options: [
      { key: 'honesty', label: 'Honesty' },
      { key: 'emotional_availability', label: 'Emotional availability' },
      { key: 'ambition', label: 'Drive and ambition' },
      { key: 'kindness', label: 'Genuine kindness' },
      { key: 'humor', label: 'A good sense of humor' },
      { key: 'faith', label: 'Shared faith or values' },
      { key: 'family_oriented', label: 'Family-oriented' },
      { key: 'independence', label: 'Respects independence' },
    ],
  },
  {
    key: 'open_to_introductions',
    prompt: 'Are you open to being introduced to someone right now?',
    type: 'single',
    options: [
      { key: 'yes_open', label: 'Yes — I am open to introductions' },
      { key: 'after_two', label: 'Yes, after I make my 2 Introductions first' },
      { key: 'not_yet', label: 'Not yet — I need more time' },
      { key: 'social_only', label: 'Social connections only for now' },
    ],
  },
];
