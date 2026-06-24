export const Colors = {
  plum: {
    50:  '#f5f0f7',
    100: '#ede0f1',
    200: '#d9bfe3',
    300: '#c49fd5',
    400: '#ae7ec6',
    500: '#9960b8',
    600: '#7d4a9a',
    700: '#62397a',
    800: '#4a2a5c',
    900: '#2D1B35',
    950: '#1a0f20',
  },
  blush: {
    50:  '#fdf4f6',
    100: '#fce8ee',
    200: '#f9d0dd',
    300: '#f4a8bf',
    400: '#ed7a9c',
    500: '#e2507a',
    600: '#cc2f5c',
    700: '#a82249',
  },
  champagne: {
    100: '#faf4e6',
    200: '#f5e7ca',
    300: '#edd5a0',
    400: '#e3be74',
    500: '#d9a84e',
  },
  rosegold: {
    300: '#f09898',
    400: '#e57171',
    500: '#c9575a',
  },
  ivory:     '#FAF7F2',
  warmWhite: '#FEF9F5',
  black:     '#0D0D0D',
  gray: {
    100: '#F5F5F5',
    200: '#E8E8E8',
    300: '#D1D1D1',
    400: '#A8A8A8',
    500: '#737373',
    600: '#525252',
    700: '#3D3D3D',
    800: '#262626',
  },
};

export const Gradients = {
  heroBg:    ['#2D1B35', '#4a2a5c', '#7d4a9a'],
  cardBlush: ['#fdf4f6', '#FAF7F2'],
  golden:    ['#f5e7ca', '#d9a84e'],
  plumFade:  ['#2D1B35', '#62397a'],
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   20,
  xl:   28,
  full: 9999,
};

export const Typography = {
  displayLg:  { fontSize: 36, fontWeight: '700' as const, letterSpacing: -0.5 },
  displayMd:  { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  displaySm:  { fontSize: 22, fontWeight: '700' as const },
  headingLg:  { fontSize: 20, fontWeight: '700' as const },
  headingMd:  { fontSize: 17, fontWeight: '600' as const },
  headingSm:  { fontSize: 15, fontWeight: '600' as const },
  bodyLg:     { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  bodyMd:     { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm:     { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption:    { fontSize: 11, fontWeight: '400' as const },
  labelLg:    { fontSize: 15, fontWeight: '600' as const },
  labelMd:    { fontSize: 13, fontWeight: '600' as const },
  labelSm:    { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
};
