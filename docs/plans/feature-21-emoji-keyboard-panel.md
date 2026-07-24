# Feature 21 — On a phone the emoji picker takes the keyboard's place

**Status: complete** (2026-07-24). Verified on localhost at phone and desktop
widths; a real-handset pass is pending — see
[docs/pending-manual-tests.md](../pending-manual-tests.md).

## The problem

Two founder screenshots on a real Android handset (2026-07-23): the student
chat's emoji picker floated a white card over the purple chat, overlaid and
clipped it, and flickered on every emoji tap. The teacher's character-emoji
slot used the same popover and looked just as wrong at phone width.

The flicker was a focus fight with a layout amplifier. `emoji-picker-react`
ships `autoFocusSearch: true`
([config.ts:87](../../client/node_modules/emoji-picker-react/src/config/config.ts))
and nobody had overridden it, so opening the picker focused its own search
`<input>` and the phone keyboard came straight back over the picker. Radix's
`onOpenAutoFocus` preventDefault could never stop it — React applies the
input's own `autoFocus` at commitMount when the lazy chunk resolves, long after
the Radix event. Each emoji tap then moved focus off the textarea, the phone's
`group-has-[textarea:focus]` chrome-collapse rules un-fired,
`interactive-widget=resizes-content` resized the card, Radix re-positioned the
portalled popover a frame behind the anchor, and the composer's own
refocus-per-insert (`requestAnimationFrame`) replayed the whole loop — twice
per tap.

## What shipped

Five end-to-end slices (one commit each), scoped so the flicker fix could land
and be judged before any layout work:

1. **Picker-level fixes.** `EmojiPickerPopover` → `EmojiPickerBody` with a
   `dock`/`box` variant. `autoFocusSearch={false}` (the single highest-value
   line), `--epr-category-padding: 0` (the real right-edge clipping bug — the
   picker measured column count on the full-width `<ul>` while the grid carried
   a 10px margin), `transition: none` (the root ships `transition: height
0.3s`), the popover finally reads `--radix-popper-available-height`, the
   teacher's "Remove" becomes a pinned footer, a size-agnostic Suspense
   fallback, and a `prefetchEmojiPicker()` warmed on composer focus. This slice
   alone fixed the desktop popover, the homepage hero, and the teacher's
   phantom keyboard.
2. **The chrome-collapse signal.** A parallel `[data-emoji-panel]` variant
   beside each `group-has-[textarea:focus]` rule (verified in the emitted CSS),
   plus `shrink-0` on the header and composer so the `h-0 flex-auto` feed —
   which absorbs none of an overflow — isn't the thing that gets crushed.
3. **The dock.** On a full-screen student chat below `sm`, the smile button
   blurs the field and drops the emoji grid into the keyboard's rectangle as an
   in-flow `shrink-0` child of the chat card; the smile becomes a keyboard
   button. Height is a constant `clamp(240px, 42dvh, 336px)`, not a
   measurement. The toggle ordering is the feature (see the decision entry).
4. **The teacher bottom sheet.** `EmojiSlot` opens a `ui/dialog`
   `variant="bottom-sheet"` below `sm`, the anchored popover above it. No new
   `ui/sheet.tsx` primitive.
5. **Docs** (this file plus the decision entries below).

## The one thing deliberately left for V1's follow-up

The dock's height is a constant, so the composer settles within a few dozen
pixels during the keyboard's own slide-out rather than staying pixel-frozen.
Pixel-exact tracking of `visualViewport` was scoped out on purpose: it needs a
settle timer, an iOS focus-zoom `scale` guard, dual height anchors so Chrome's
URL bar isn't read as a keyboard, a frozen clamp ceiling, a measurement cache,
and a two-box reveal — and every hard bug in prototyping lived in that
machinery. Build it only if the settle reads as a jump on a real device.

## Decisions recorded

- [On a phone the emoji panel takes the keyboard's place](../decisions/chat-behavior.md#on-a-phone-the-emoji-panel-takes-the-keyboards-place)
- [On a phone, picking a character's emoji is a bottom sheet, not a popover](../decisions/teacher-setup.md#on-a-phone-picking-a-characters-emoji-is-a-bottom-sheet-not-a-popover)
- Amended: "The composer's emoji picker stays open across inserts" (the phone
  dismissal contract and the real cause of the focus steal) and "While a
  student types on a phone, the world's chrome gets out of the way" (the second
  signal).

## Verification

- `pnpm typecheck` / `pnpm lint` clean on every slice.
- `pnpm test` unchanged — client tests are pure logic with no DOM, and none
  import the touched files (nothing to add).
- Browser, phone (390×844) and desktop (1280×900), against `verify:up
--scale 10`: `tools/verify/scratch/emoji-dock.mjs` (22 checks — dock is
  in-flow, chrome stays collapsed across the blur, focus never leaves the field
  on a pick, inserts land at the caret, the dock survives a send, every
  dismissal path, desktop still uses the popover) and
  `tools/verify/scratch/emoji-teacher.mjs` (18 checks — sheet docks to the
  bottom edge full width and names the row on a phone, popover on a laptop, no
  phantom keyboard, Remove works).
- **Not yet run — a real handset.** Headless Chrome has no software keyboard,
  so the composer-doesn't-move promise and the iOS pan-back caveat can only be
  judged on a device. Recorded in
  [docs/pending-manual-tests.md](../pending-manual-tests.md).
