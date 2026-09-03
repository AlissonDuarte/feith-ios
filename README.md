# fidio mobile

App iOS nativo em React Native + Expo, consumindo a mesma API FastAPI que o
frontend SvelteKit (`front_fide`).

Segue o padrão do `lexa-mobile`: Expo com CNG, `expo-router`, NativeWind,
`fastlane match` e build inteiro no GitHub Actions — sem Mac no fluxo.

## Requisitos

- **Node 22** (`nvm use 22`).
- Para iOS **não é preciso Mac**: o build roda no runner `macos-26` do GitHub
  Actions. Ver `.github/workflows/ios.yml`.

## Rodar em desenvolvimento

```bash
npm install
cp .env.example .env      # ajuste EXPO_PUBLIC_API_URL
npm start                 # abre o Metro para o development build
```

**O Expo Go não serve para este app.** Google Sign-In, Sign in with Apple,
`expo-notifications` e (a partir da M5) o StoreKit são todos módulos nativos.
O fluxo é: rodar a lane `devclient` uma vez, instalar o build pelo TestFlight
interno, e daí em diante `npm start` recarrega o JS no aparelho. Só quando uma
dependência **nativa** mudar é preciso gerar outro dev client.

`EXPO_PUBLIC_API_URL` **não pode ser `localhost`** quando o app roda num
aparelho físico — o telefone resolveria para ele mesmo. Use o IP da máquina na
LAN e adicione esse IP ao CORS do backend (`fide-backend/main.py:45-50`).

O `app.config.ts` injeta a exceção de App Transport Security
(`NSAllowsLocalNetworking`) automaticamente **apenas** quando a URL configurada
é `http://`. Um build apontando para `https://api.fidio.online/api` sai sem
nenhuma brecha de cleartext.

## Estrutura

```
app/                    rotas (expo-router, file-based)
  _layout.tsx           AuthProvider, fontes e o guard central de rota
  (auth)/               login, registro
  (tabs)/               hoje, anotações, favoritos, histórico, perfil
  leitura/[key].tsx     uma reflexão — aberta pelos três feeds
  perfil/               editar, notificações
  onboarding.tsx        carrossel de boas-vindas
  r/[token].tsx         link compartilhado — PÚBLICO, fora do guard
  politicas.tsx         também público (a App Review precisa alcançar)
src/
  api/types.ts          contrato da API, derivado de fide-backend/api/schemas/
  api/client.ts         fetch tipado, 401 → logout, erro já em pt-BR
  api/dates.ts          os três formatos de data não-ISO do backend
  api/agendamento.ts    dias do lembrete (lista vazia = todos os dias)
  hooks/                useListaPaginada (scroll infinito + busca)
  api/errors.ts         tradução de `detail` (inglês) para pt-BR
  auth/                 AuthContext + persistência (SecureStore)
  push/                 registro de device token no APNs
  theme/palette.js      paleta (CommonJS: o tailwind.config.js consome)
  theme/tokens.ts       tokens tipados + os três modos de leitura
  components/           ui, ReflexaoReader
```

`ios/` e `android/` **não são versionados**: são gerados por `expo prebuild` no
CI (continuous native generation).

## Relação com o frontend web

`front_fide` **não tem camada de API**: cada componente Svelte chama `fetch()`
inline com o objeto de options repetido à mão. O `src/api/client.ts` centraliza
isso e carrega quatro coisas que a web não tem:

1. **Bearer em vez de cookie httpOnly.** O backend hoje só lê cookie
   (`auth_service.py:81`); `fetch` nativo não seta cookie httpOnly. O suporte a
   `Authorization` no backend é pré-requisito para este app autenticar.
2. **401 desloga e navega.** A web mostra um toast e deixa a pessoa presa numa
   tela vazia — nenhuma rota dela redireciona para o login.
3. **Erro já traduzido.** O backend responde `detail` em inglês em toda a API
   (`"Not subscribed"`, `"Limit exceeded"`); nenhuma dessas strings pode chegar
   à tela de um app pt-BR. Ver `src/api/errors.ts`.
4. **Guard de rota central**, em `app/_layout.tsx`, em vez de nenhum.

Como o backend expõe `/openapi.json` mas não documenta quais campos são datas
formatadas nem quais endpoints mentem no código HTTP, `src/api/types.ts` é a
documentação de fato do contrato — ao mexer num schema do backend, atualize lá.

### Três armadilhas do backend que o client já cobre

- **Datas não são ISO.** São três formatos diferentes, e um deles inverte a
  ordem (`"HH:MM:SS dd/mm/aaaa"`). `new Date("03/04/2026")` devolveria 4 de
  março. Ver `src/api/dates.ts`.
- **Dois endpoints devolvem HTTP 200 com `{status: false}`** quando falham
  (`user_note_views.py:39` e `:148`). O código HTTP mente.
- **Sem reflexão publicada, `/reflections/daily` não devolve 404** — devolve
  todos os campos em branco com `uuid: ""` (`reflection_service.py:39-51`). A
  tela precisa tratar isso, senão renderiza cards vazios e parece quebrada.

Além disso, `GET /reflections/daily` **tem efeito colateral**: registra a
leitura do dia, que é o que alimenta o streak. Buscar o streak antes dele
mostra o número de ontem.

E o agendamento do lembrete tem uma convenção fácil de inverter: **lista de
dias vazia significa TODOS os dias**, porque o filtro do backend é
`if days and current_day not in days`. A conversão vive em
`src/api/agendamento.ts`, com teste — inverter isso silenciosamente faria a
pessoa parar de receber lembretes sem nenhum sinal na interface.

## Build iOS

Três workflows:

- `ci.yml` — ubuntu, roda em todo push. Typecheck, testes, `expo-doctor`,
  guarda anti-Stripe, e empacota o bundle iOS de verdade (`expo export`), que
  pega import quebrado sem gastar minuto de macOS.
- `ios-credentials.yml` — `workflow_dispatch`, roda **uma vez** e a cada
  capability nova. Cria certificado e provisioning profile via `fastlane match`
  e guarda cifrados num repo git privado separado.
- `ios.yml` — `workflow_dispatch` (seletor de lane, **default `beta`**) ou push
  de tag `v*`. Lanes: `beta` publica no TestFlight, `devclient` gera o
  development build, `build_only` para antes do upload — útil para validar
  prebuild, pods e assinatura sem consumir número de build.

O repo é privado, e runner macOS consome minutos com **multiplicador 10x**: os
2.000 min/mês gratuitos equivalem a ~200 min de macOS, e um build leva 15–25
min. Por isso nenhum deles roda em push comum. Valide o que der localmente
antes de gastar minuto de macOS:

```bash
npm run typecheck
npm test
npx expo export --platform ios     # pega import quebrado
npx expo prebuild --platform ios   # gera ios/ sem compilar: dá para ler o Info.plist
```

### Tipos de rota

`experiments.typedRoutes` faz o TypeScript validar cada `router.push()` contra
as rotas que existem de verdade. Mas os tipos vivem em `.expo/types/`, que **não
é versionado e não sai do `expo export`** — quem os gera é o dev server.

Consequência: num clone limpo, `tsc` passa sem validar navegação nenhuma, e um
`router.push('/rota-que-nao-existe')` só quebraria no aparelho. Por isso o
`ci.yml` sobe o dev server só para gerar os tipos, e falha se eles não vierem.
Localmente eles aparecem no primeiro `npm start`.

### Capabilities

O App ID `online.fidio.app` precisa de **quatro**: Sign In with Apple (como
primary), Push Notifications, Associated Domains e In-App Purchase. Todas já
estão declaradas no `app.config.ts` desde o primeiro commit, de propósito.

O provisioning profile nasce com as capabilities que o App ID tinha **naquele
momento**, e o `match` roda em `readonly` nos builds — ele só baixa o que já
está no repo de certificados. Habilitar uma capability no portal não muda um
profile que já existe. Então, ao mexer nisso, nesta ordem:

1. No Apple Developer portal, habilite a capability no App ID **e salve** (a
   confirmação é um passo separado).
2. Rode `ios-credentials.yml` — é ele que regenera o profile (`readonly: false`
   + `force: true`).
3. Só então rode `ios.yml`.

Sem o passo 2 o archive falha com *"Provisioning profile ... doesn't include
the ... entitlement"*. E sem o `force` o `match` nem regenera: ele vê que o
profile guardado ainda é válido — a validação dele não olha capabilities —, diz
*"All required keys, certificates and provisioning profiles are installed 🙌"*
e o build seguinte falha idêntico. O `Fastfile` confere isso logo após o match
e falha explicando, em vez de deixar o `xcodebuild` morrer 30s depois.

### `aps-environment`

`'development'` aponta o app para o APNs sandbox; `'production'` para o real. Os
dois registram e devolvem device token normalmente — o erro só aparece do outro
lado: um build de TestFlight assinado com `development` recebe token, manda para
o backend e **nunca entrega nada, sem log nenhum no aparelho**. Por isso o
`ios.yml` exporta `APS_ENVIRONMENT=production` explicitamente e confere o valor
no entitlement gerado, e o default local é o sandbox.

### Pagamento

No iOS a cobrança é **100% StoreKit**. A web continua no Stripe; são dois
caminhos para o mesmo entitlement, e o backend distingue pela coluna `provider`.

A diretriz 3.1.1 rejeita qualquer caminho de pagamento externo — e a web tem o
checkout do Stripe pronto para ser copiado por engano
(`PriceTableModal.svelte:17-33`, `SubscriptionSection.svelte`). Por isso o CI
tem uma guarda que quebra o build ao encontrar menção a Stripe, URL de checkout
ou chamada aos endpoints de assinatura da web. Exceção legítima passa marcando
a **mesma linha** com `stripe-ok: <motivo>`, o que mantém cada uma visível no
code review.

### Login com Google

O botão só aparece quando os dois client IDs estão configurados; sem eles o app
funciona normalmente, só com usuário e senha.

Isso é o certo dentro do app — melhor nenhum botão do que um que só falharia ao
ser tocado —, mas numa build de release é o oposto: sairia um TestFlight sem
login social e sem erro nenhum no log. Por isso `ios.yml` confere os secrets
antes do prebuild e o `Info.plist` depois dele, e falha o build em vez de
esconder o botão.

1. No Google Cloud Console (**APIs e serviços › Credenciais**), no mesmo projeto
   que já atende o site, crie um **client ID OAuth do tipo iOS** com o bundle
   `online.fidio.app`.
2. Preencha `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` com ele e
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` com o client **web** que o site já usa. O
   URL scheme do callback é derivado do client iOS automaticamente, em
   `app.config.ts`.
3. No backend, `GOOGLE_CLIENT_ID` e o novo client iOS precisam ser passados **os
   dois** como audiência na verificação do `id_token`, porque o `aud` muda
   conforme a origem: o site manda o client web e o app manda o iOS.

### Sign in with Apple

Obrigatório pela **Guideline 4.8**: um app que oferece login social de terceiros
(aqui, o Google) precisa oferecer o da Apple também.

Diferente do Google, não há client ID para configurar — o `aud` do identity
token é o próprio bundle. A disponibilidade é decidida em runtime por
`isAvailableAsync()`: aparece no iOS 13+, some no Android.

Nome e e-mail só chegam na **primeira** autorização de cada usuário; depois
disso a Apple manda apenas o `sub`. Por isso eles sobem junto no mesmo POST — é
a única janela em que existem, e quem persiste é o backend.

## Pendências conhecidas

- **O ícone é um placeholder.** `assets/icon.png` é o "f" em Cormorant Garamond
  sobre pergaminho: tecnicamente correto (1024×1024, sem alfa, sem cantos
  próprios — o iOS aplica a máscara), mas precisa de design de verdade antes da
  submissão.
- `app/politicas.tsx` está vazia: o conteúdo tem que ser portado de
  `front_fide/src/routes/policies` antes de submeter.
- O player de áudio (M4) e a assinatura via StoreKit (M5) ainda não existem.
- O registro envia `birth_date` vazio e `gender: 'other'` porque o backend
  exige os dois campos (`user_schemas.py:5-12`), mas nenhum é necessário para
  ler um devocional — coletar dado sem necessidade é questionamento certo na
  App Review (5.1.1). O ideal é torná-los opcionais no backend.

## Secrets necessários

| Secret | O que é |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.fidio.online/api` |
| `EXPO_PUBLIC_WEB_URL` | `https://fidio.online` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | client OAuth **web** (o mesmo do site) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | client OAuth **iOS** do bundle `online.fidio.app` |
| `EXPO_PUBLIC_IAP_SKU` | `online.fidio.supporter.monthly` |
| `APPLE_TEAM_ID` | Team ID da conta Apple Developer |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` | App Store Connect API Key |
| `ASC_KEY_P8` | o arquivo `.p8` da chave, em base64 |
| `MATCH_GIT_URL` | repo **privado e separado** para os certificados |
| `MATCH_PASSWORD` | senha que cifra esse repo |
| `MATCH_GIT_BASIC_AUTHORIZATION` | base64 de `usuario:token` com acesso a ele |
