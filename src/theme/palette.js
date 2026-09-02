/**
 * Paleta fidio.
 *
 * A web tem DUAS identidades que nunca foram reconciliadas: as paginas de
 * marketing usam oxblood + ouro sobre pergaminho (routes/+page.svelte,
 * callback, PriceTable) e o app usa ambar + slate sobre off-white
 * (routes/user/**). O app nativo nao carrega o marketing, entao aqui a
 * identidade de app e a principal; oxblood e ouro sobrevivem apenas como
 * acentos do modo sepia e de ornamentos.
 *
 * CommonJS de proposito: tailwind.config.js precisa dar require() nisto, e um
 * .ts nao e carregavel de la. O tokens.ts tipado importa deste arquivo, entao a
 * paleta existe uma vez so.
 */
module.exports = {
  // Superficies — off-white de routes/user/home/+page.svelte:221
  bg: '#FCFCFE',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#F1F5F9',
  'border-soft': '#F8FAFC',

  // Pergaminho, de callback/+page.svelte:223. Base do modo sepia.
  parchment: '#FCFAF5',
  'parchment-deep': '#F4ECD8',

  // Texto (slate)
  text: '#1E293B',
  'text-soft': '#334155',
  muted: '#64748B',
  'muted-soft': '#94A3B8',

  // Primaria: ambar — o acento do app inteiro
  primary: '#F59E0B',
  'primary-dark': '#B45309',
  'primary-light': '#FDE68A',
  'primary-tint': '#FFFBEB',

  // Marca editorial: oxblood + ouro (marketing da web, acentos no sepia)
  oxblood: '#7A1F1F',
  'oxblood-light': '#922525',
  gold: '#B89C5C',
  'gold-dark': '#8B6914',

  // Escuro (modo noturno)
  'dark-bg': '#0B1220',
  'dark-surface': '#111A2B',
  'dark-border': '#1E293B',
  'dark-text': '#E8EDF5',

  // Status
  success: '#10B981',
  'success-soft': '#ECFDF5',
  danger: '#E11D48',
  'danger-soft': '#FFF1F2',
  info: '#0EA5E9',

  // Streak
  streak: '#F97316',
  'streak-dark': '#C2410C',
};
