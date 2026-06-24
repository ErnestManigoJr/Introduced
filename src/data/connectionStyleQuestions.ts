export type TraitKey =
  | 'social_energy'
  | 'one_on_one_preference'
  | 'decision_logic'
  | 'decision_feeling'
  | 'planning_preference'
  | 'spontaneity'
  | 'alone_recharge'
  | 'people_recharge'
  | 'detail_orientation'
  | 'big_picture_orientation'
  | 'traditional_problem_solving'
  | 'creative_problem_solving'
  | 'emotional_expression'
  | 'emotional_privacy'
  | 'structure_preference'
  | 'flexibility_preference'
  | 'analytical_style'
  | 'empathetic_style'
  | 'concrete_thinking'
  | 'abstract_thinking'
  | 'conversation_initiative'
  | 'trust_experience'
  | 'trust_intuition'
  | 'closure_preference'
  | 'option_openness'
  | 'adaptability'
  | 'emotional_depth';

export type TraitScoreMap = Partial<Record<TraitKey, number>>;

export interface QuestionOption {
  key: string;
  label: string;
  traits: TraitScoreMap;
}

export interface ConnectionStyleQuestion {
  key: string;
  prompt: string;
  category: string;
  categoryLabel: string;
  options: QuestionOption[];
}

export const CONNECTION_STYLE_QUESTIONS: ConnectionStyleQuestion[] = [
  {
    key: 'social_style',
    prompt: 'Do you prefer spending time in large groups or having one-on-one conversations?',
    category: 'social_energy',
    categoryLabel: 'Social Style',
    options: [
      {
        key: 'large_groups',
        label: 'Large groups',
        traits: { social_energy: 3, one_on_one_preference: -2, conversation_initiative: 1 },
      },
      {
        key: 'small_groups',
        label: 'Small groups',
        traits: { social_energy: 1, one_on_one_preference: 1, adaptability: 1 },
      },
      {
        key: 'one_on_one',
        label: 'One-on-one conversations',
        traits: { social_energy: -1, one_on_one_preference: 3, emotional_depth: 2 },
      },
      {
        key: 'depends_people',
        label: 'It depends on the people',
        traits: { adaptability: 2, one_on_one_preference: 1, social_energy: 1 },
      },
      {
        key: 'both_equally',
        label: 'I enjoy both equally',
        traits: { social_energy: 2, adaptability: 3 },
      },
    ],
  },
  {
    key: 'decision_style',
    prompt: 'When making decisions, do you rely more on logic or on your feelings?',
    category: 'decision_style',
    categoryLabel: 'Decision Style',
    options: [
      {
        key: 'mostly_logic',
        label: 'Mostly logic',
        traits: { decision_logic: 3, decision_feeling: -1, analytical_style: 2 },
      },
      {
        key: 'mostly_feelings',
        label: 'Mostly feelings',
        traits: { decision_feeling: 3, decision_logic: -1, empathetic_style: 2 },
      },
      {
        key: 'balance_both',
        label: 'A balance of both',
        traits: { decision_logic: 1, decision_feeling: 1, analytical_style: 1, empathetic_style: 1 },
      },
      {
        key: 'logic_first',
        label: 'Logic first, feelings second',
        traits: { decision_logic: 2, decision_feeling: 1, analytical_style: 2 },
      },
      {
        key: 'feelings_first',
        label: 'Feelings first, logic second',
        traits: { decision_feeling: 2, decision_logic: 1, empathetic_style: 2 },
      },
    ],
  },
  {
    key: 'planning_style',
    prompt: 'Do you prefer to plan things out in advance or be spontaneous?',
    category: 'planning_preference',
    categoryLabel: 'Planning Style',
    options: [
      {
        key: 'clear_plan',
        label: 'I like a clear plan',
        traits: { planning_preference: 3, spontaneity: -2, structure_preference: 2 },
      },
      {
        key: 'plan_with_room',
        label: 'Plan the important things, leave room for surprise',
        traits: { planning_preference: 2, spontaneity: 1, adaptability: 2 },
      },
      {
        key: 'spontaneous',
        label: 'I like to be spontaneous',
        traits: { spontaneity: 3, planning_preference: -2, flexibility_preference: 2 },
      },
      {
        key: 'others_plan',
        label: 'I prefer someone else to plan',
        traits: { planning_preference: -1, adaptability: 2, flexibility_preference: 1 },
      },
      {
        key: 'depends_situation',
        label: 'It depends on the situation',
        traits: { adaptability: 3, planning_preference: 1, spontaneity: 1 },
      },
    ],
  },
  {
    key: 'energy_source',
    prompt: 'Are you more energized by spending time alone or by being around others?',
    category: 'recharge_style',
    categoryLabel: 'Energy Source',
    options: [
      {
        key: 'time_alone',
        label: 'Time alone',
        traits: { alone_recharge: 3, people_recharge: -2, social_energy: -1 },
      },
      {
        key: 'close_people',
        label: 'Time with close people',
        traits: { people_recharge: 3, one_on_one_preference: 2, emotional_depth: 1 },
      },
      {
        key: 'social_events',
        label: 'Social events',
        traits: { people_recharge: 2, social_energy: 3, alone_recharge: -1 },
      },
      {
        key: 'mix',
        label: 'A mix of alone time and people time',
        traits: { alone_recharge: 1, people_recharge: 1, adaptability: 2 },
      },
      {
        key: 'mood_dependent',
        label: 'It depends on my mood',
        traits: { adaptability: 3, alone_recharge: 1, people_recharge: 1 },
      },
    ],
  },
  {
    key: 'attention_style',
    prompt: 'Do you focus more on the facts and details, or do you look at the big picture?',
    category: 'cognitive_style',
    categoryLabel: 'Attention Style',
    options: [
      {
        key: 'facts_details',
        label: 'Facts and details',
        traits: { detail_orientation: 3, big_picture_orientation: -1, concrete_thinking: 2 },
      },
      {
        key: 'big_picture',
        label: 'The big picture',
        traits: { big_picture_orientation: 3, detail_orientation: -1, abstract_thinking: 2 },
      },
      {
        key: 'both_equally',
        label: 'Both equally',
        traits: { detail_orientation: 1, big_picture_orientation: 1, adaptability: 1 },
      },
      {
        key: 'details_then_big',
        label: 'Details first, then the big picture',
        traits: { detail_orientation: 2, big_picture_orientation: 1, concrete_thinking: 1 },
      },
      {
        key: 'big_then_details',
        label: 'Big picture first, then details',
        traits: { big_picture_orientation: 2, detail_orientation: 1, abstract_thinking: 1 },
      },
    ],
  },
  {
    key: 'problem_solving',
    prompt: 'When solving problems, do you prefer tried-and-true methods or new approaches?',
    category: 'problem_solving',
    categoryLabel: 'Problem-Solving Style',
    options: [
      {
        key: 'proven_methods',
        label: 'Tried-and-true methods',
        traits: { traditional_problem_solving: 3, creative_problem_solving: -1, trust_experience: 2 },
      },
      {
        key: 'new_approaches',
        label: 'New and creative approaches',
        traits: { creative_problem_solving: 3, traditional_problem_solving: -1, trust_intuition: 2 },
      },
      {
        key: 'mix_both',
        label: 'A mix of both',
        traits: { traditional_problem_solving: 1, creative_problem_solving: 1, adaptability: 2 },
      },
      {
        key: 'proven_first',
        label: 'Proven methods first, then adjust',
        traits: { traditional_problem_solving: 2, creative_problem_solving: 1, trust_experience: 1 },
      },
      {
        key: 'new_then_test',
        label: 'New ideas first, then test them',
        traits: { creative_problem_solving: 2, traditional_problem_solving: 1, trust_intuition: 1 },
      },
    ],
  },
  {
    key: 'emotional_expression',
    prompt: 'Do you tend to express your emotions openly or keep them to yourself?',
    category: 'emotional_style',
    categoryLabel: 'Emotional Expression',
    options: [
      {
        key: 'openly',
        label: 'I express emotions openly',
        traits: { emotional_expression: 3, emotional_privacy: -2, emotional_depth: 2 },
      },
      {
        key: 'once_trust',
        label: 'I share once I trust someone',
        traits: { emotional_expression: 1, emotional_privacy: 1, emotional_depth: 2, closure_preference: 1 },
      },
      {
        key: 'mostly_private',
        label: 'I keep emotions mostly private',
        traits: { emotional_privacy: 3, emotional_expression: -2 },
      },
      {
        key: 'through_actions',
        label: 'I express through actions more than words',
        traits: { emotional_expression: 1, emotional_privacy: 1, concrete_thinking: 1 },
      },
      {
        key: 'depends_relationship',
        label: 'It depends on the relationship',
        traits: { adaptability: 2, emotional_expression: 1, emotional_privacy: 1 },
      },
    ],
  },
  {
    key: 'daily_rhythm',
    prompt: 'Do you feel more comfortable following a schedule or going with the flow?',
    category: 'lifestyle_rhythm',
    categoryLabel: 'Daily Rhythm',
    options: [
      {
        key: 'schedules',
        label: 'I like schedules',
        traits: { structure_preference: 3, flexibility_preference: -2, planning_preference: 2 },
      },
      {
        key: 'structure_flexibility',
        label: 'Some structure with flexibility',
        traits: { structure_preference: 2, flexibility_preference: 1, adaptability: 2 },
      },
      {
        key: 'go_with_flow',
        label: 'I prefer going with the flow',
        traits: { flexibility_preference: 3, structure_preference: -2, spontaneity: 2 },
      },
      {
        key: 'routines_adapt',
        label: 'I like routines but can adapt',
        traits: { structure_preference: 2, adaptability: 2, flexibility_preference: 1 },
      },
      {
        key: 'dislike_boxed',
        label: 'I dislike feeling boxed in',
        traits: { flexibility_preference: 3, option_openness: 2, structure_preference: -2 },
      },
    ],
  },
  {
    key: 'relationship_lens',
    prompt: 'Would you describe yourself as more analytical or more empathetic?',
    category: 'relational_style',
    categoryLabel: 'Relationship Lens',
    options: [
      {
        key: 'analytical',
        label: 'Analytical',
        traits: { analytical_style: 3, empathetic_style: -1, decision_logic: 2 },
      },
      {
        key: 'empathetic',
        label: 'Empathetic',
        traits: { empathetic_style: 3, analytical_style: -1, emotional_depth: 2 },
      },
      {
        key: 'balanced',
        label: 'Balanced',
        traits: { analytical_style: 1, empathetic_style: 1, adaptability: 1 },
      },
      {
        key: 'analytical_emotional',
        label: 'Analytical but emotionally aware',
        traits: { analytical_style: 2, empathetic_style: 1, decision_logic: 1, emotional_depth: 1 },
      },
      {
        key: 'empathetic_practical',
        label: 'Empathetic but practical',
        traits: { empathetic_style: 2, analytical_style: 1, concrete_thinking: 1, emotional_depth: 1 },
      },
    ],
  },
  {
    key: 'information_style',
    prompt: 'Do you prefer dealing with concrete, tangible information or abstract theories?',
    category: 'cognitive_style',
    categoryLabel: 'Information Style',
    options: [
      {
        key: 'concrete',
        label: 'Concrete, practical information',
        traits: { concrete_thinking: 3, abstract_thinking: -1, detail_orientation: 1 },
      },
      {
        key: 'abstract',
        label: 'Abstract ideas and theories',
        traits: { abstract_thinking: 3, concrete_thinking: -1, big_picture_orientation: 1 },
      },
      {
        key: 'mix_both',
        label: 'A mix of both',
        traits: { concrete_thinking: 1, abstract_thinking: 1, adaptability: 1 },
      },
      {
        key: 'practical_first',
        label: 'Practical first, ideas second',
        traits: { concrete_thinking: 2, abstract_thinking: 1 },
      },
      {
        key: 'ideas_first',
        label: 'Ideas first, practical details later',
        traits: { abstract_thinking: 2, concrete_thinking: 1 },
      },
    ],
  },
  {
    key: 'conversation_style',
    prompt: 'When it comes to social settings, do you usually initiate conversations or wait for others to approach you?',
    category: 'social_initiative',
    categoryLabel: 'Conversation Style',
    options: [
      {
        key: 'usually_start',
        label: 'I usually start conversations',
        traits: { conversation_initiative: 3, social_energy: 2 },
      },
      {
        key: 'start_if_comfortable',
        label: 'I start if I feel comfortable',
        traits: { conversation_initiative: 1, emotional_privacy: 1, adaptability: 1 },
      },
      {
        key: 'usually_wait',
        label: 'I usually wait for others',
        traits: { conversation_initiative: -2, one_on_one_preference: 1, emotional_privacy: 1 },
      },
      {
        key: 'quiet_then_open',
        label: "I'm quiet at first, then open up",
        traits: { emotional_privacy: 2, emotional_expression: 1, emotional_depth: 1 },
      },
      {
        key: 'depends_setting',
        label: 'It depends on the setting',
        traits: { adaptability: 3, conversation_initiative: 1 },
      },
    ],
  },
  {
    key: 'environment_preference',
    prompt: 'Do you prefer a structured environment or a more flexible one?',
    category: 'lifestyle_rhythm',
    categoryLabel: 'Environment Preference',
    options: [
      {
        key: 'structured',
        label: 'Structured',
        traits: { structure_preference: 3, flexibility_preference: -2 },
      },
      {
        key: 'mostly_structured',
        label: 'Mostly structured',
        traits: { structure_preference: 2, flexibility_preference: -1, adaptability: 1 },
      },
      {
        key: 'flexible',
        label: 'Flexible',
        traits: { flexibility_preference: 3, structure_preference: -2 },
      },
      {
        key: 'mostly_flexible',
        label: 'Mostly flexible',
        traits: { flexibility_preference: 2, structure_preference: -1, adaptability: 1 },
      },
      {
        key: 'balance',
        label: 'A balance of both',
        traits: { structure_preference: 1, flexibility_preference: 1, adaptability: 2 },
      },
    ],
  },
  {
    key: 'trust_style',
    prompt: 'Are you more inclined to trust your experience or your intuition?',
    category: 'trust_style',
    categoryLabel: 'Trust Style',
    options: [
      {
        key: 'experience',
        label: 'Experience',
        traits: { trust_experience: 3, trust_intuition: -1, traditional_problem_solving: 1 },
      },
      {
        key: 'intuition',
        label: 'Intuition',
        traits: { trust_intuition: 3, trust_experience: -1, creative_problem_solving: 1 },
      },
      {
        key: 'both_equally',
        label: 'Both equally',
        traits: { trust_experience: 1, trust_intuition: 1, adaptability: 1 },
      },
      {
        key: 'experience_first',
        label: 'Experience first, intuition second',
        traits: { trust_experience: 2, trust_intuition: 1 },
      },
      {
        key: 'intuition_first',
        label: 'Intuition first, experience second',
        traits: { trust_intuition: 2, trust_experience: 1 },
      },
    ],
  },
  {
    key: 'closure_style',
    prompt: 'Finally, do you see yourself as a person who likes clear closure or who enjoys keeping options open?',
    category: 'commitment_style',
    categoryLabel: 'Closure Style',
    options: [
      {
        key: 'clear_closure',
        label: 'I like clear closure',
        traits: { closure_preference: 3, option_openness: -2, planning_preference: 1 },
      },
      {
        key: 'closure_enough_info',
        label: 'Closure once I have enough information',
        traits: { closure_preference: 2, option_openness: -1, trust_experience: 1 },
      },
      {
        key: 'options_open',
        label: 'I like keeping options open',
        traits: { option_openness: 3, closure_preference: -2, flexibility_preference: 1 },
      },
      {
        key: 'live_with_uncertainty',
        label: 'I can live with uncertainty',
        traits: { option_openness: 2, adaptability: 2, flexibility_preference: 1 },
      },
      {
        key: 'depends_stakes',
        label: 'It depends on what is at stake',
        traits: { adaptability: 3, closure_preference: 1, option_openness: 1 },
      },
    ],
  },
];

export const ALL_TRAITS: TraitKey[] = [
  'social_energy', 'one_on_one_preference', 'decision_logic', 'decision_feeling',
  'planning_preference', 'spontaneity', 'alone_recharge', 'people_recharge',
  'detail_orientation', 'big_picture_orientation', 'traditional_problem_solving',
  'creative_problem_solving', 'emotional_expression', 'emotional_privacy',
  'structure_preference', 'flexibility_preference', 'analytical_style', 'empathetic_style',
  'concrete_thinking', 'abstract_thinking', 'conversation_initiative', 'trust_experience',
  'trust_intuition', 'closure_preference', 'option_openness', 'adaptability', 'emotional_depth',
];

export const COMPLEMENT_TRAIT_PAIRS: [TraitKey, TraitKey][] = [
  ['planning_preference', 'spontaneity'],
  ['big_picture_orientation', 'detail_orientation'],
  ['analytical_style', 'empathetic_style'],
  ['social_energy', 'alone_recharge'],
  ['structure_preference', 'flexibility_preference'],
  ['concrete_thinking', 'abstract_thinking'],
  ['conversation_initiative', 'one_on_one_preference'],
];

export const FRICTION_TRAIT_PAIRS: [TraitKey, TraitKey][] = [
  ['closure_preference', 'option_openness'],
  ['emotional_expression', 'emotional_privacy'],
  ['structure_preference', 'spontaneity'],
  ['decision_logic', 'decision_feeling'],
];
