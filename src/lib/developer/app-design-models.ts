/** The models a design can be made with in the app (Design tab), the settings' default added when it differs. */
export const MODEL_CHOICES = [
  { id: 'anthropic/claude-opus-5.5', label: 'Claude Opus 5.5' },
  { id: 'gpt-6-sol', label: 'GPT-6 Sol' },
  { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5' },
];

export const modelLabel = (id: string | null) => MODEL_CHOICES.find((m) => m.id === id)?.label ?? id ?? '';
