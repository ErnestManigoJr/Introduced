export const CONSENT_VERSIONS = {
  terms_of_use:            '1.0',
  privacy_policy:          '1.0',
  community_guidelines:    '1.0',
  dating_disclaimer:       '1.0',
  age_confirmation:        '1.0',
  data_processing:         '1.0',
  intro_room_recording:    '1.0',
  marketing_communications:'1.0',
} as const;

export type ConsentType = keyof typeof CONSENT_VERSIONS;

export const REQUIRED_CONSENTS: ConsentType[] = [
  'age_confirmation',
  'terms_of_use',
  'privacy_policy',
  'community_guidelines',
  'dating_disclaimer',
  'data_processing',
];

export const ONBOARDING_STEPS = [
  'age_gate',
  'terms',
  'privacy',
  'guidelines',
  'disclaimer',
  'username',
  'profile_basics',
  'profile_photo',
  'interests',
  'intention',
  'personality',
  'privacy_prefs',
  'intro_optin',
  'complete',
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];
