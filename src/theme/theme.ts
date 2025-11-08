export const theme = {
  colors: {
    background: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    black: '#000000',
    accentStart: '#7C3AED',
    accentEnd: '#06B6D4',
  },
  spacing: { sm: 12, md: 20, lg: 32 },
  radii: { md: 16 },
  typography: { font: 'System', title: 42, label: 16 },
};
export type Theme = typeof theme;