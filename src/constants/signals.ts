export const SIGNAL_WEIGHTS = {
  profile:      0.25,
  personality:  0.30,
  community:    0.20,
  interaction:  0.15,
  introduction: 0.10,
} as const;

export const INTRODUCTIONS_REQUIRED = 2;

export const PERSONALITY_QUESTIONS = [
  {
    key: 'energy',
    question: 'How do you recharge after a long day?',
    options: [
      { value: 'alone', label: 'Quiet time alone' },
      { value: 'small_group', label: 'Small group of close friends' },
      { value: 'social', label: 'Out with a crowd' },
      { value: 'mixed', label: 'Depends on the day' },
    ],
  },
  {
    key: 'conflict',
    question: 'When something bothers you in a relationship, you...',
    options: [
      { value: 'direct', label: 'Address it directly' },
      { value: 'time', label: 'Wait until you are calm' },
      { value: 'hints', label: 'Drop hints and hope they notice' },
      { value: 'ignore', label: 'Let it go most of the time' },
    ],
  },
  {
    key: 'future',
    question: 'Which future excites you most?',
    options: [
      { value: 'roots', label: 'Settled in one place, deep roots' },
      { value: 'adventure', label: 'Traveling and exploring' },
      { value: 'build', label: 'Building something meaningful' },
      { value: 'family', label: 'A full, loving household' },
    ],
  },
  {
    key: 'love_language',
    question: 'You feel most loved when...',
    options: [
      { value: 'words', label: 'Someone tells you directly' },
      { value: 'time', label: 'They give you real quality time' },
      { value: 'acts', label: 'They do things for you' },
      { value: 'touch', label: 'Physical warmth and closeness' },
    ],
  },
  {
    key: 'pace',
    question: 'How do you like things to move in a new relationship?',
    options: [
      { value: 'slow', label: 'Slow and intentional' },
      { value: 'natural', label: 'Naturally, wherever it goes' },
      { value: 'quick', label: 'When it is right, move fast' },
      { value: 'structured', label: 'Clear milestones, no ambiguity' },
    ],
  },
  {
    key: 'values',
    question: 'What matters most to you in a partner?',
    options: [
      { value: 'honesty', label: 'Honesty above everything' },
      { value: 'ambition', label: 'Drive and ambition' },
      { value: 'kindness', label: 'Warmth and kindness' },
      { value: 'humor', label: 'Laughter and lightness' },
    ],
  },
  {
    key: 'communication',
    question: 'Your ideal communication style is...',
    options: [
      { value: 'constant', label: 'Regular check-ins throughout the day' },
      { value: 'deep', label: 'Fewer but deeper conversations' },
      { value: 'spontaneous', label: 'Spontaneous and natural' },
      { value: 'async', label: 'Respond when I can, no pressure' },
    ],
  },
  {
    key: 'faith',
    question: 'How does spirituality or faith factor into your life?',
    options: [
      { value: 'central', label: 'It is central to who I am' },
      { value: 'personal', label: 'Personal but important' },
      { value: 'open', label: 'Open to different perspectives' },
      { value: 'secular', label: 'Not part of my lifestyle' },
    ],
  },
  {
    key: 'children',
    question: 'When it comes to children...',
    options: [
      { value: 'want', label: 'I definitely want children' },
      { value: 'open', label: 'Open to it with the right person' },
      { value: 'no', label: 'I do not want children' },
      { value: 'have', label: 'I already have children' },
    ],
  },
  {
    key: 'weekends',
    question: 'A perfect weekend looks like...',
    options: [
      { value: 'adventure', label: 'An adventure or trip somewhere' },
      { value: 'home', label: 'Cozy at home, movies and food' },
      { value: 'social', label: 'Dinner parties and seeing friends' },
      { value: 'growth', label: 'Something that feeds my mind or body' },
    ],
  },
  {
    key: 'finances',
    question: 'Your relationship to money is...',
    options: [
      { value: 'saver', label: 'I save intentionally for the future' },
      { value: 'balanced', label: 'Balance between saving and enjoying' },
      { value: 'experience', label: 'Experiences matter more than things' },
      { value: 'builder', label: 'I am building wealth actively' },
    ],
  },
  {
    key: 'conflict_repair',
    question: 'After a disagreement, you usually...',
    options: [
      { value: 'talk', label: 'Want to talk it through right away' },
      { value: 'space', label: 'Need some space first' },
      { value: 'gesture', label: 'Show it through actions' },
      { value: 'humor', label: 'Use humor to ease tension' },
    ],
  },
  {
    key: 'ambition',
    question: 'How would you describe your ambition level?',
    options: [
      { value: 'high', label: 'Very driven, always building toward something' },
      { value: 'balanced', label: 'Ambitious but deeply value rest' },
      { value: 'purpose', label: 'Purpose-driven, not title-driven' },
      { value: 'present', label: 'Focused on present joy over future goals' },
    ],
  },
  {
    key: 'dealbreaker',
    question: 'The thing that matters most in a potential connection is...',
    options: [
      { value: 'alignment', label: 'Core values alignment' },
      { value: 'chemistry', label: 'Undeniable chemistry' },
      { value: 'vision', label: 'Shared vision for the future' },
      { value: 'peace', label: 'They bring me peace' },
    ],
  },
] as const;
