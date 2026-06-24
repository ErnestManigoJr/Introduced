export const APP = {
  name:    'Introduced',
  tagline: 'Meet through people, not swipes.',
  promise: 'One meaningful introduction can change everything.',
};

export const INTAKE = {
  title:    'Your Connection Style',
  subtitle: 'A few quick questions to help Introduced understand how you connect, communicate, and build trust.',
  progress: (current: number, total: number) => `${current} of ${total}`,
  next:     'Continue',
  back:     'Back',
  complete: 'See My Connection Style',
  saving:   'Saving your answers…',
  completeHeadline: 'Your Connection Style is ready.',
  completeBody:
    'Introduced can now suggest more meaningful introductions based on how you connect, communicate, and build trust.',
  completeAction: 'Continue to Introduced',
};

export const SIGNAL_LABELS = {
  strong:   'Strong Introduction Signal',
  good:     'Good Introduction Signal',
  possible: 'Possible Connection',
  early:    'Early Signal',
};

export const EMPTY_STATES = {
  noSuggestions:  'No suggested introductions yet.\nComplete your Connection Style and profile to unlock suggestions.',
  notOpen:        'You are not yet open to introductions.\nMake 2 Introductions to unlock this feature.',
  needTwo:        'Make 2 Introductions to become Open to Introductions.',
  noRequests:     'No Introduction Requests yet.',
  noPosts:        'Nothing here yet.\nBe the first to post in The Nest.',
  noRooms:        'You have not joined any Rooms yet.',
  noMessages:     'No messages yet.\nStart a conversation.',
  profileIncomplete: 'Complete your profile to get better Introduction Signals.',
};

export const ERRORS = {
  generic:       'Something went wrong. Please try again.',
  network:       'No connection. Check your internet and try again.',
  auth:          'Sign-in failed. Please check your credentials.',
  uploadFailed:  'Upload failed. Please try again.',
  uploadTooLarge:'File is too large. Photos max 10 MB, videos max 100 MB.',
  usernameUnavailable: 'That username is taken.',
};

export const CONSENT = {
  age: {
    title:    'You must be 18 or older.',
    subtitle: 'Introduced is an adult platform. Please confirm your date of birth.',
    action:   'I confirm I am 18 or older',
  },
  terms: {
    title:   'Terms of Use',
    summary: 'By using Introduced, you agree to use this platform with respect, honesty, and care for others. This is a community built on trust.',
    action:  'I accept the Terms of Use',
  },
  privacy: {
    title:   'Privacy Policy',
    summary: 'Your data is yours. We collect only what is needed to make Introduced work, and we will never sell your personal information.',
    action:  'I accept the Privacy Policy',
  },
  guidelines: {
    title:   'Community Guidelines',
    summary: 'Introduced is a space for genuine connection. Harassment, spam, explicit content, and dishonesty are not welcome here.',
    action:  'I accept the Community Guidelines',
  },
  disclaimer: {
    title:   'Introduction Disclaimer',
    summary: 'Introduced helps people connect through trusted introductions. We do not guarantee relationship outcomes. You are responsible for your interactions. Please stay safe.',
    action:  'I understand and agree',
  },
};
