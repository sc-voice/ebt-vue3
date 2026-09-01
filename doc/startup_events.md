# App Startup Event Flow

## Overview
The EBT app startup is driven by **external system events** that cascade through stores and components. The process is not a linear sequence but rather event-driven, with multiple parallel and sequential flows depending on user history (URL, settings, cache).

**Critical Architectural Note: State Collision Risk**
The startup process involves a high-stakes interaction between **Route/URL events** and **Storage/Settings events**. Because the application's initial state (settings) is hydrated based on the current URL, external inputs like an inbound link can collide with the initialization sequence. If not handled carefully, a Route event can inadvertently trigger a reset of the entire Settings state during the hydration phase.

## External Event Sources

### 1. Window & DOM Events
**Keyboard Input**
- `window.addEventListener('keydown', ...)` — src/App.vue:497
- Routes key events to audio controls, navigation, or settings

**Focus Events**
- `window.addEventListener('focusin', ...)` — src/App.vue:498
- Tracks active element for accessibility and audio focus

**Resize Events**
- `document.defaultView.onresize` — src/stores/volatile.mjs:112
- Triggered by `displayBox` computed getter
- Updates viewport dimensions for responsive layout

### 2. Storage & Settings Events
**LocalStorage Load**
- `settings.loadSettings(config)` — src/App.vue:469
- **Timing:** Awaited during mounted hook (blocks until complete)
- Loads user preferences: theme, language, tutorial state, card positions
- Sets `settings.loaded = true` gate for downstream components
- **Risk:** Susceptible to state corruption if URL-based logic mutates the settings object during hydration.

**Settings Subscription**
- `settings.$subscribe((mutation, state) => ...)` — src/App.vue:493-495
- Reactive listener for all setting changes
- Updates theme, locale, persists changes to localStorage
- Unsubscribed on component destroy

**IndexedDB Cache**
- `Idb.get(idbKey)` — src/stores/volatile.mjs:207
- Retrieves cached suttas, search results, audio metadata
- Used during search and card rendering to avoid refetches

### 3. Route & URL Hash Events
**Initial URL Hash**
- `window.location.hash` — src/App.vue:466, 481
- Read during mounted hook
- Determines which card to load (wiki path vs home path)
- **Collision Risk:** Inbound hash changes can trigger logic in the settings store that may inadvertently reset the entire configuration state (e.g., wiping preferences while attempting to create a new card).

**Hash Change (Implicit)**
- Setting `window.location.hash = route` — src/stores/volatile.mjs:424
- Browser fires hashchange event (Vue Router listens)
- Triggers route change, loads new card content

**Route-to-Card Mapping**
- `cardFactory.pathToCard({path:route, addCard})` — src/App.vue:485-487
- Parses hash like `#/sutta/dn1/en/bhikkhu` into card data
- Returns null if route invalid (falls back to home)

### 4. Network Events
**Search API**
- `volatile.fetch(url)` → POST search query — src/stores/volatile.mjs:168, 594
- Called by search card render
- Returns results + mlDocs (multilingual content)

**Wiki Content**
- `volatile.fetchWikiHtml(card)` — src/stores/volatile.mjs:488-543
- Fetches static wiki HTML from `${config.basePath}/content/{path}.html`
- Retries with home page if not found
- Shows error if both fail

**JSON Fetches**
- `this.fetchJson(url)` — used for API responses
- Wraps `this.fetch()` and calls `.json()`

**Text Fetches**
- `volatile.fetchText(href)` — src/stores/volatile.mjs:447-463
- Used for wiki HTML, content files
- Warns on 404, returns undefined

### 5. Timer Events
**Deferred Audio Setup**
- `setTimeout(..., 2000)` — src/App.vue:470-479
- Waits 2 seconds after mount, then sets audio volume from settings
- Allows audio element to stabilize before setting properties

**Playback Progress**
- `setInterval(..., 100)` — src/stores/audio.mjs:509-523
- Updates audioElapsed during playback
- Accumulates playedSeconds for timeout tracking
- Clears on scid change (segment interruption)

**Waiting Indicator**
- `setTimeout(..., waitingDelay)` — src/stores/volatile.mjs:568-572
- Shows spinner only if wait > delay (avoids flash for fast operations)
- Used during search, wiki fetch, IDB operations

## Event Timeline During Startup

```
1. HTML loads, Vue mounts App component
   ↓
2. created() hook — optional logging setup
   ↓
3. mounted() hook begins:
   ├─ await settings.loadSettings() — BLOCKING GATE #1
   │  └─ loads from localStorage or config defaults
   │
   ├─ read window.location.hash
   ├─ determine card (wiki hash or home path)
   ├─ create initial wikiCard or homeCard
   │
   ├─ set theme & locale from settings
   ├─ subscribe to settings changes
   │
   ├─ addEventListener('keydown')
   ├─ addEventListener('focusin')
   │
   └─ setTimeout(2000) → set audio volume
   
4. Template renders:
   ├─ EbtProcessing (immediately)
   ├─ Settings (immediately)
   ├─ EbtChips if !collapsed
   └─ EbtCards if isReady (BLOCKING GATE #2)

5. isReady computed:
   ├─ check settings.loaded
   ├─ check settings.cards.length > 0
   └─ trigger EbtCards render when true

6. EbtCards mount:
   ├─ load route from window.location.hash
   ├─ fetch sutta content or wiki HTML
   ├─ render segments/chips
   └─ call card.open() → sets isOpen

7. Parallel events continue:
   ├─ window resize → update displayBox
   ├─ hash change → navigate to new card
   ├─ search query → fetch + cache results
   └─ audio playback → setInterval updates
```

## Blocking Gates

### Gate #1: Settings Loaded
```javascript
// src/App.vue:469
await settings.loadSettings(config);
```
- **Blocks:** App.mounted() continuation
- **Triggers:** Settings template render (line 92)
- **Impact:** Audio elements, theme, locale all wait on this

### Gate #2: Cards Ready
```javascript
// src/App.vue:104
<EbtCards v-if="isReady"/>
```
- **Blocks:** EbtCards component render
- **Depends on:** settings.loaded && settings.cards.length
- **Impact:** Defers content render until settings complete

## Debug Flags
Enable with `src/defines.mjs`:
```javascript
export const DBG_STARTUP = 1;  // line 66 — overall startup sequence
export const DBG_APP_MOUNTED = 1;  // — App.mounted() hook
export const DBG_IS_READY = 1;     // — isReady gate transitions
export const DBG_ROUTE = 1;        // — setRoute() hash navigation
export const DBG_FETCH = 1;        // — network requests
export const DBG_HOME = 1;         // — home/wiki path logic
export const DBG_KEY = 1;          // — keyboard event routing
```

## Trace a specific flow:
```bash
# Watch for route changes
grep -n "setRoute\|DBG_ROUTE" src/**/*.{js,vue,mjs}

# Watch settings load
grep -n "loadSettings\|settings.loaded" src/**/*.{js,vue,mjs}

# Watch card factory
grep -n "pathToCard\|addCard" src/**/*.{js,vue,mjs}
```

## Key Components & Stores
| Component | Role | Lifecycle |
|-----------|------|-----------|
| **App.vue** | Entry point, mounts stores, routes | mounted hook |
| **EbtProcessing** | Async work indicator | Immediate render |
| **Settings** | User preferences modal | Immediate render |
| **EbtCards** | Card display + content | Conditional (isReady) |
| **EbtChips** | Segment/search results | Conditional (!collapsed) |
| **settings store** | User prefs (theme, lang, cards) | loadSettings() on mount |
| **audio store** | Playback state, keyboard handling | useAudioStore() in data |
| **volatile store** | Transient state (route, waiting, focus) | useVolatileStore() in data |

## Common Startup Issues

**Issue: State Collision (Inbound Links)**
- **Symptom:** Following a link to a new sutta resets the user's theme, language, and other settings.
- **Cause:** The settings hydration logic (Gate #1) incorrectly resets the entire `savedState` object to `null` when an inbound URL context doesn't match the current `pathCard`.
- **Debug:** Set `DBG.APP_MOUNTED = 1` and watch for unexpected resets in `src/stores/settings.mjs`.

**Issue: Settings not loading**
- Check: localStorage disabled? config.js malformed?
- Debug: Set `DBG.APP_MOUNTED = 1`, watch for error in console

**Issue: Cards not rendering (stuck on loading)**
- Check: `settings.cards` array empty? `isReady` computed never true?
- Debug: Set `DBG_IS_READY = 1`, inspect `this.settings.loaded` and `this.settings.cards`

**Issue: Hash change not routing**
- Check: Card factory returning null? Invalid path format?
- Debug: Set `DBG_ROUTE = 1`, watch setRoute() calls

**Issue: Wiki HTML not loading**
- Check: Network tab for 404 on `/content/...html`
- Debug: Set `DBG_HOME = 1`, watch fetchWikiHtml() attempts and fallback

## References
- App entry: `src/App.vue` lines 456-499 (mounted hook)
- Route handling: `src/stores/volatile.mjs` lines 358-445 (setRoute)
- Card factory: `src/card-factory.mjs`
- Settings store: `src/stores/settings.mjs`
- Volatile store: `src/stores/volatile.mjs`
```