/**
 * Paleta feith.
 *
 * A web tem DUAS identidades que nunca foram reconciliadas: as paginas de
 * marketing usam oxblood + ouro sobre pergaminho (routes/+page.svelte,
 * callback, PriceTable) e o app usa ambar + slate sobre off-white
 * (routes/user/**). O ambar-sobre-slate e a identidade generica de dashboard —
 * a mesma de qualquer SaaS — e era ela que o app nativo carregava.
 *
 * Aqui a decisao esta tomada no sentido oposto: a identidade EDITORIAL do
 * marketing e a principal. E ela que promete "exegese seria" antes de qualquer
 * palavra ser lida, e e a unica das duas que sustenta o preco do produto. O
 * ambar sobrevive apenas onde precisa gritar (streak, alerta de quota).
 *
 * CommonJS de proposito: tailwind.config.js precisa dar require() nisto, e um
 * .ts nao e carregavel de la. O tokens.ts tipado importa deste arquivo, entao a
 * paleta existe uma vez so.
 */
module.exports = {
  // ── Superficies ────────────────────────────────────────────────────────────
  // Creme e o `body { background-color: #faf8f4 }` da landing; `warm` e a
  // `.bg-warm` das secoes alternadas. Branco puro fica reservado aos cards, o
  // que da a eles o relevo que um off-white sobre off-white nunca teve.
  cream: '#FAF8F4',
  warm: '#F5F0E8',
  surface: '#FFFFFF',
  parchment: '#FCFAF5',
  'parchment-deep': '#F4ECD8',

  // Vidro da `.glass-card` — sobre creme, nao sobre branco.
  glass: 'rgba(255,255,255,0.72)',
  'glass-strong': 'rgba(255,255,255,0.92)',

  // ── Tinta ──────────────────────────────────────────────────────────────────
  // Preto tipografico, nao slate: #1a1a1a da landing. Slate puxa para o azul e
  // briga com o pergaminho.
  ink: '#1A1A1A',
  'ink-soft': '#2A2A2A',
  'ink-muted': '#5A5A5A',
  'ink-faint': '#8A8A8A',
  'ink-ghost': '#AFA89C',

  // ── Fios ───────────────────────────────────────────────────────────────────
  // Hairlines quentes. O #F1F5F9 anterior era um cinza-azulado que sobre creme
  // aparecia esverdeado.
  rule: '#E6E0D4',
  'rule-soft': '#EFEAE0',

  // ── Oxblood: o acento da marca ─────────────────────────────────────────────
  oxblood: '#7A1F1F',
  'oxblood-light': '#922525',
  'oxblood-bright': '#A52D2D',
  'oxblood-tint': '#F4EDEC',
  'oxblood-veil': 'rgba(122,31,31,0.10)',

  // ── Ouro: fios, numerais e ornamentos ──────────────────────────────────────
  gold: '#8B6914',
  'gold-light': '#B89C5C',
  'gold-pale': '#D8C79A',
  'gold-tint': '#F7F1E2',

  // ── Escuro (modo noturno de leitura) ───────────────────────────────────────
  // Marrom-carvao, e nao azul-marinho: o modo noturno de um app de leitura
  // continua sendo papel, so que sem luz.
  'dark-bg': '#15120F',
  'dark-surface': '#1E1A16',
  'dark-rule': '#2E2822',
  'dark-text': '#EDE7DB',

  // ── Status ─────────────────────────────────────────────────────────────────
  success: '#2F6B4F',
  danger: '#9B2C2C',
  'danger-soft': '#FBF0EF',

  // Streak: o unico lugar em que o ambar continua fazendo sentido — e um
  // numero que precisa brilhar, nao um texto que precisa ser lido.
  streak: '#B4841F',
  'streak-tint': '#FAF3E2',
};
