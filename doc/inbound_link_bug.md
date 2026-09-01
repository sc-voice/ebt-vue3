# Research: Cards Disappearing on Startup

## Summary
Users report "cards are disappearing." Investigation revealed **three independent but interacting bugs** in the startup/settings-hydration flow, not just the inbound-link regression. All three must be fixed together and in sequence for the symptom to be fully resolved.

## The Three Bugs

### Bug A — `isReady` Computed Gate is Inert (Root Cause)
**Location:** `src/App.vue:501-520`

The `isReady` computed is declared `async` inside Vue3 Options API `computed:` block. Vue3 does not await async computed getters — the computed's cached value is the `Promise` object itself, which is always truthy. This means:
- `<EbtCards v-if="isReady"/>` (line 104) has **never actually gated anything**
- EbtCards mounts immediately on every render, regardless of whether `settings.loaded` is true or cards exist
- The dead `return result;` branch at line 512 references an undefined variable (though this branch never executes because the Promise is always truthy before the async body even evaluates)

**Symptom:** EbtCards mounts before `settings.loadSettings()` completes, enabling Bug B.

### Bug B — Mount-Order Race Discards Freshly Created Cards
**Location:** Race between `src/App.vue:469` (`await settings.loadSettings()`) and `src/components/EbtCards.vue:57-69` (`EbtCards.mounted()`)

Because Bug A's gate never actually blocks, `EbtCards.mounted()` runs before `App.mounted()`'s `await settings.loadSettings(config)` resolves:
1. `EbtCards.mounted()` calls `cardFactory.pathToCard({path, addCard})`
2. This creates and pushes a new card into `settings.cards` via `#addCard` (card-factory.mjs:127-141)
3. When `loadSettings()` resolves, `src/stores/settings.mjs:85` runs `Utils.assignTyped(this, EbtSettings.INITIAL_STATE, savedState)`
4. `Utils.assignTyped` (src/utils.mjs:20-21) handles arrays by doing `dst[k] = [...value]` — it **replaces** the entire `settings.cards` array with a fresh copy built from the persisted `savedState.cards`
5. The card just pushed by `EbtCards.mounted()` is silently discarded

**Symptom:** Cards flash in then vanish on page load/refresh — visible, reproducible on every startup.

**Critical constraint:** `EbtSettings.INITIAL_STATE.cards = []` (src/ebt-settings.mjs:147). For a first-time visitor with no saved state, the *only* place a first card is created is inside `EbtCards.mounted()`. A gate that requires `cards.length > 0` would deadlock new users entirely, which is why the original `cards.length` branch in `isReady` is dead code.

### Bug C — Inbound-Link Mismatch Wipes All Settings, Not Just Cards
**Location:** `src/stores/settings.mjs`, `loadSettings()`, lines 71-73

When an inbound link points to a sutta not already in `savedState.cards`:
```javascript
if (context && !pathCard) {
  savedState = null;  // 🔴 wipes EVERYTHING
}
```

This discards the entire hydrated settings object, losing:
- Theme (dark/light)
- Language preferences
- Audio volume
- Tutorial state
- All other persistent user configuration

**Symptom:** Following an inbound link to any new sutta (not already open) resets all user preferences.

## Why These Bugs Interact

The startup sequence is:
1. `App.mounted()` awaits `settings.loadSettings(config)` (line 469)
2. But because Bug A's gate is inert, `EbtCards` has already mounted (Bug B race setup)
3. When `loadSettings()` resolves, it may null `savedState` (Bug C), losing preferences
4. Then `Utils.assignTyped` replaces `settings.cards` wholesale (Bug B mechanism), losing any card created by prematurely-mounted EbtCards

All three must be fixed together:
- Fixing C alone doesn't stop cards from vanishing on ordinary loads (Bug B)
- Fixing A alone without understanding B's chicken-and-egg (cards-length gate vs. first-time-visitor startup) could deadlock new users
- Fixing B requires A to be real (a truly-blocking gate)

## Root Causes by Symptom

| User Reports | Root Cause | Triggered By |
|---|---|---|
| Cards disappear on page load/refresh | Bug B (mount race + array swap) | Every page load where Bug A is inert |
| Cards disappear after following inbound link | Bug C (`savedState = null`) | Following any link to a sutta not in saved cards |
| Settings (theme, lang) reset after inbound link | Bug C | Following any link to a sutta not in saved cards |
| First-time visitor sees nothing | Bug A (gate inert) + Bug B (race) + no existing cards | First page load with no saved state |

## The Fix Strategy

**Bug C (Fix First — Simplest, Most Isolated):**
```javascript
if (context && !pathCard) {
  savedState.cards = [];  // Clear only cards, preserve theme/lang/audio/tutorial
}
```
Narrow the blast radius. The `catch(e)` block's full `savedState = null` remains appropriate for genuinely corrupt stored data.

**Bug A (Fix Second — Structural):**
Replace the broken async computed with a real reactive boolean (`data.isReady`) driven by a `watch` handler. Gate only on `settings.loaded` (not `cards.length`, which would deadlock new users). Move `volatile.verifyState()` out of the gate into `App.mounted()` after `loadSettings()` resolves.

**Bug B (Fix Third — Automatic):**
No code change needed; falls out naturally once Bug A's gate is real. Verify via regression tests.

## References
- See `/Users/visakha/.claude/plans/we-are-in-planning-shiny-ripple.md` for full implementation plan
- Related: `doc/startup_events.md` — event-driven startup flow architecture
