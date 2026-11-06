# GoKifuStudio

**GoKS-v.1.0** (internal version 1.0.0). Windows PC Go record editor, KataGo analysis and game interface. Japanese/English and normal/simple views are supported.

Extract the entire Windows ZIP and run `GoKS.exe`. No engine is included. Record editing and human games work without an engine. Read `Manual.html` for offline instructions in either language. Source ZIPs do not contain the executable; use the Windows GitHub Actions build to produce it.

Open Engines → Engine List → Set up CPU engine. After confirmation, GoKS extracts KataGo Eigen v1.18.1 and its DLLs into katago beside GoKS.exe and places the compressed model in katago/models. Review the settings and click Add to List. Existing folders are never overwritten. If the folder is not writable, move GoKS to a writable location or register an external engine manually.

The recommended versions are pinned and never update automatically. For a newer engine, extract the new official Windows ZIP including DLLs into a separate folder such as katago-new, place a model in its models subfolder, and register the folder under a new name. For a model-only update, obtain the Network File from the official model list, keep it compressed under a different filename in models, and create a new profile using the existing executable and new model. Test analysis before changing the startup radio button. Select the old profile to roll back.

[KataGo releases](https://github.com/lightvector/KataGo/releases) · [KataGo networks](https://katagotraining.org/networks/)


Use **Appearance & Sound** in the left panel or **View → Appearance & Sound** in Simple View. Settings open in an independent, resizable window. Preview changes, Apply to save without closing, or Revert/Close to restore saved preferences. Japanese and English store their text settings separately.

- Body text: 12/14/16/18px; prominent text: 14/16/18/20px; help: 12/12/14/16px.
- Normal button height: 24/26/28/30px, padding 3px.
- Choose or enter an installed font family. Missing fonts fall back to the system font.
- Board labels: 80/100/120%; themes: Warm wood / Paper / Night; custom colors and images.
- Graph colors, 1–4px line widths in 0.5px increments, solid/dashed lines.
- Three original synthesized stone sounds, or a WAV file; volume 0–100%; separate move/navigation/autoplay options. PV hover is silent.

Images: PNG/JPEG/WebP up to 8 MB, resized to at most 512px. WAV: up to 1 MB. Large text may wrap or require scrolling. The graph's move axis uses numeric labels with collision avoidance and 25-move ruler ticks.

The Windows package contains the EXE, READMEs, Manual.html, LICENSE.txt, license pages and notices, and SHA256.txt. App assets are embedded in the EXE.

Author-owned portions use the MIT license, allowing commercial use, modification and redistribution with the copyright and permission notice retained. Third-party components retain their own licenses. See LICENSE.txt and THIRD_PARTY_NOTICES.md.

This is a pre-release validation build. Final third-party notice verification and actual Windows testing remain required before public distribution. No professional games or tsumego are included as sample material. The Manual currently uses text instructions without game screenshots.

Repository: https://github.com/hebaeba/GoKS

## Engines and games

The radio button at the right of each engine row selects the next startup engine. The shared up/down buttons move the selected row. Missing startup registrations or files produce a warning. Open Engines → Engine List. Use an existing KataGo folder, or choose Get CPU engine, extract the entire ZIP including DLLs, and use Get model. Put the compressed model in the same folder or its models subfolder. Choose KataGo folder, select among multiple matches, browse for missing files, and click Add to List. A GTP config is optional. Select the radio button beside a profile only if it should start with GoKS.

[CPU engine](https://github.com/lightvector/KataGo/releases/download/v1.18.1/katago-v1.18.1-eigen-windows-x64.zip) · [Model](https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b10c128-s1141046784-d204142634.txt.gz)

New Game contains setup and pre-game controls in one foldable section. Once play starts, the controls and a bordered summary of Black, White, handicap stone count and komi remain visible. Pause and takeback reuse engines that support cancellable search; older engines may need to restart during an active search. Human–AI score graphs use Black’s perspective. AI–AI win rates and scores use each AI’s own perspective. Switching views preserves the game. Keyboard Shortcuts is in the left panel.

## More appearance options

Select an installed Windows font or enter its family name and press Enter; manual entry is available if enumeration fails. Shaded, flat and image stones each offer three presets per color, plus custom images. The warm wood theme applies subtle grain while retaining the board color. Outer background controls the main window’s margins; panel background controls its panels.

Importing a board image automatically selects Image texture. Importing a WAV selects custom audio. Imported filenames are retained; clearing a WAV restores the default sound.

## Updating and reporting bugs

Preserve the ZIP folder structure when updating. Report the version, Windows environment, engine and reproduction steps. Remove personal names, IP addresses, local paths and tokens from logs, and do not publish games without permission.

Build with `.github/workflows/windows.yml` and `scripts/build-windows.ps1`. Upload a consistent source set; `web/window-assets.json` checks release integrity. Change histories and changed-file lists are kept in `UPDATE*.md`; this README describes current features rather than accumulating update-specific instructions. See `UPDATE109.md` for this update.

## Human game clock

Select a System for each human player. AI players retain their existing time/visit search limits. The five systems are Absolute, Byo-yomi, Fischer, Canadian and Unlimited, in that order. Unlimited has no timeout.

| System | Fields and defaults | Behavior |
|---|---|---|
| Absolute | Main 30 min | Exhausting main time loses on time. |
| Byo-yomi | Main 30 min / Byo-yomi 30 s / 5 periods | After main time, moving in time resets the current period. Exhausted periods never return. Exhausting the final period loses on time. |
| Fischer | Main 10 min / Increment 5 s | Add 5 seconds after each legal move or pass, never after flagfall. |
| Canadian | Main 0 min / Block 10 min / 15 moves | Start with 15 moves in 10 minutes. Completing the quota resets the block to 10 minutes and 15 moves; unused time is not carried over. Optional main time precedes the repeating blocks. |
| Unlimited | No fields | No timeout. |

Only relevant fields are shown, normally in one row. Main time and byo-yomi have extra space between them; seconds and periods are paired as 30 / 5. Very narrow panels or larger text may still wrap. Zero main time starts directly in byo-yomi or Canadian overtime; zero byo-yomi periods gives absolute time.

A movable, resizable clock window opens on game start; use Game Clock to reopen it. Closing it does not stop time. Pause, estimates and move validation stop the clock. Takeback does not refund thinking time and removes increments or block renewals earned by undone moves; this can result in flagfall.

Byo-yomi beeps every second, louder at one second remaining and during the final period. Other systems beep in the final ten seconds. Uncheck Clock sound to mute.

On Windows, the clock stays above the main app when playing moves. Its position, size and monitor are remembered for the next opening, adjusted to the available work area if the display setup changes. Minimizing the main app also hides the clock; restoring it shows the clock again.

Reset defaults in Appearance & Sound resets only the selected tab and preserves other tabs. In Text, it resets the current language and board labels. Choose Apply to save the reset.
