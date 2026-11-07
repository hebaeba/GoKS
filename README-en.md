# GoKifuStudio / Go棋譜Studio

**GoKS-v.1.0 (internal version 1.0.0)**

GoKifuStudio is a Windows PC application for editing Go game records, analyzing positions with KataGo, and playing games. It supports Japanese and English and both Normal View and Simple View. The executable is `GoKS.exe`.

## Getting started

Extract the complete Windows ZIP and run `GoKS.exe`. No KataGo engine is included. You can edit game records and play human-versus-human games without an engine.

To register KataGo for CPU use, choose **CPU engine automatic setup** at the top of the Engine menu. After you confirm, GoKS downloads KataGo Eigen v1.18.1 and a model and installs them in the `katago` folder beside `GoKS.exe`. Progress is shown for each stage, and the engine is registered automatically on completion (there is no need to click Add to List). If an existing `katago` folder is present, it is backed up before replacement. If the destination is not writable, move GoKS into a writable folder or register the engine manually.

The CPU engine version used by automatic setup is fixed and does not update automatically. For a newer engine, download the Windows ZIP from the official KataGo releases and extract it into a different folder, such as `katago-new`. Put the .gz model in that folder's `models` subfolder and register it under a different name in Engine List. For a model-only update, download a Network File from the official models list and save it in `models` under another filename. Use New to register the existing engine (`katago.exe`) with the new compressed model.

[KataGo releases](https://github.com/lightvector/KataGo/releases) · [KataGo networks](https://katagotraining.org/networks/)

Open **Individual downloads** under Engine. Choose **Get CPU engine** to download KataGo Eigen v1.18.1 and extract the ZIP. Choose **Get CPU model** and place the downloaded .gz file, without decompressing it, in the extracted engine folder or its `models` subfolder. Under Engine List, choose New, enter an Engine name, and use Browse beside the Engine, Model, and Config CFG fields to select the files. Click Add to List. Config CFG may be left blank. Check the Startup radio button beside an engine name if you want GoKS.exe to start it automatically.

[CPU engine](https://github.com/lightvector/KataGo/releases/download/v1.18.1/katago-v1.18.1-eigen-windows-x64.zip) / [CPU model](https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-b10c128-s1141046784-d204142634.txt.gz)

For instructions, open the included **Manual.html** and choose Japanese or English.

If this is the source ZIP, it does not include an executable. Run the Windows build using GitHub Actions and obtain the generated `GoKS-v.1.0` artifact. Do not confuse the ready-to-use Windows ZIP from Releases with GitHub's automatically generated “Source code” archives.

## Features

- Viewing and editing game records, variations, comments, handicap and free handicap setups, and board symbols.
- Importing record and image files from file selection, drag and drop, and the clipboard.
- KataGo current-position and full-game analysis, principal variations, graphs, and score-loss / win-rate rankings.
- Human versus AI, AI versus AI, and human versus human games, with pause, resume, and takeback.
- Estimates and end-of-game scoring.
- Saving records and analysis, board images, printing, move-sequence GIFs, and temporary saved states.
- Customizing fonts, board, background, graphs, and stone sounds.

## Text, appearance, and sound

Open Appearance & Sound from the left panel, or use View → Appearance & Sound in Simple View, to open a separate settings window. The window can be moved and resized.

| Setting | Available options |
|---|---|
| Standard text | Small 12 / Normal 14 / Large 16 / Extra Large 18px |
| Headings and prominent labels | 14 / 16 / 18 / 20px |
| Helper text | 12 / 12 / 14 / 16px |
| Standard button height | 24 / 26 / 28 / 30px, with 3px internal padding |
| Fonts | Select or enter the name of a font installed on the PC |
| Board numbers and symbols | 80 / 100 / 120%, scaled with the board size |
| Themes | Warm wood, paper-white, night; individual color adjustment |
| Board and stones | Plain, wood grain, custom image; shaded, flat, or image-based stones |
| Graphs | Colors, line widths of 1–4px in 0.5px steps, solid or dashed lines |
| Stone sounds | Three original synthesized sounds or WAV, volume 0–100% |

Text sizes and fonts are saved separately for Japanese and English. Larger text may wrap or require scrolling. If a selected font is unavailable, the system font is used. Font files are not distributed.

Changes are previewed. Revert or Close restores any unsaved settings. Reset defaults resets only the currently selected section, retaining the others. Text settings apply to the current language and to board numbers and symbols. Stone sounds can be configured separately for moves, navigation, and autoplay; hovering over a candidate variation is silent. Choose **Save** to keep the changes.

Choose from the Windows installed-font list, or enter a font family name and press Enter. You can enter a name manually even if the list is unavailable. For each of black and white stones, choose among three examples of shaded, flat, or image-based styles, or register your own images. The warm-wood theme adds a subtle grain while retaining the board color. Outer background applies to the space around the interface; Panel background applies to panels.

Images must be PNG/JPEG/WebP and at most 8 MB (resized to a maximum of 512px for storage). Sound files must be WAV and at most 1 MB. Depending on the environment, sound may not play before the first user interaction.

Importing a board image automatically switches the board texture to Image; importing a WAV sets the sound to WAV File. The filename is retained. Clearing the WAV restores the standard stone sound.

The bottom of the graph shows move numbers only. Tick labels are thinned to avoid overlap, but short ticks at every 25 moves and the final move number remain. For extremely narrow ranges, such as an empty board, the number of displayed labels is limited to what fits.

## Engine and games

The engine with the Startup radio button selected at the right of Engine List is launched when GoKS starts. The ↑ and ↓ controls beside the registered-engine count move the selected engine. If the registered engine or its files cannot be found, a warning is displayed. No engine is registered on the first launch.

Set up a game in New Game (Players / Conditions). Before starting, the settings and controls can be collapsed together. Once the game begins, the controls and a panel showing Black's and White's names, even game / handicap count, and komi appear. Pause and Takeback reuse the KataGo engines running the game; older engines without interruptible search support may need to restart when interrupted during thinking.

In a human-versus-KataGo game, the score-difference graph is from Black's perspective. In AI-versus-AI games, both win rate and score difference are shown from each AI's own perspective. Switching between Simple View and Normal View preserves the record and game. Keyboard controls are listed in the left panel under Key controls.

## Human game clock

For a human player, choose among Absolute, Byo-yomi, Fischer, Canadian, and Unlimited in the System field. AI players continue to use the usual time and visit limits.

| System | Default fields and values | Behavior |
|---|---|---|
| Absolute | Main time: 30 minutes | Running out of time loses the game. |
| Byo-yomi | Main time: 30 minutes; 30 seconds / 5 periods | After main time, moves within a period reset that period; fully used periods are lost. Using up the last period loses the game. |
| Fischer | Main time: 30 minutes; increment: 10 seconds / move | Ten seconds is added after each legal move or pass. Flagfall loses the game. No maximum is imposed. |
| Canadian | Main time: 0 minutes; block: 10 minutes; quota: 15 moves | From the start, play 15 moves within 10 minutes. Each completed quota grants a fresh 10 minutes / 15 moves without carrying over unused time. A nonzero main time precedes the block phase. |
| Unlimited | No fields | No flagfall. |

Only the input fields needed for the selected system are normally shown on one line. Seconds and number of periods appear together as `30 / 5`. Very narrow panels or large fonts may wrap to avoid overlap. In Byo-yomi, main time 0 starts directly in overtime; 0 periods means main time only.

An independent clock window opens at the start of the game. Reopen it with Game Clock. Closing the window does not stop the clock. Pausing the game, calculating estimates, and confirming moves pause the clock. Takeback does not return time already spent, and any increments or block renewals earned by undone moves are reversed; this may cause flagfall.

Byo-yomi sounds a warning every second, with a stronger sound on the last second and final period. Other modes sound warnings during the final ten seconds. Uncheck Clock sound in the clock window to mute the warnings.

## Contents of the Windows distribution ZIP

| File or folder | Purpose |
|---|---|
| GoKS.exe | Main application (UI and assets are bundled into the executable) |
| README.md / README-en.md | Startup and overview |
| Manual.html | Offline user manual in Japanese and English |
| LICENSE.txt | MIT license for the application's original code |
| licenses.html / licenses-en.html / licenses/ | License details, including third-party materials |
| THIRD_PARTY_NOTICES.md | Bundled components, sources, and related notices |
| SHA256.txt | Executable checksum |

## License

The parts of the application owned by its author are licensed under MIT terms, allowing use, modification, and redistribution including commercial use. Retain the copyright and license notice and consult `LICENSE.txt` for the exact terms. KataGo, its models, DLLs, and other third-party materials are governed by their own terms.

## Development and bug reports

Source: https://github.com/hebaeba/GoKS

When reporting an issue, include the version, Windows environment, engine used, and steps to reproduce. Do not publish names, IP addresses, local paths, or tokens from logs, or game records you are not permitted to share.

Build using `.github/workflows/windows.yml` and `scripts/build-windows.ps1`. The `web/window-assets.json` manifest checks consistency of the independent windows. When updating source files, apply all files from the same revision together.
