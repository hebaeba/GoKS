# GoKifuStudio

Version **0.8.0-preview.2**, pre-release validation build (update101). Windows PC Go record editor, KataGo analysis and game interface. Japanese/English and normal/simple views are supported.

Extract the entire Windows ZIP and run `GoKifuStudio.exe`. Keep `engines/` beside the executable. End users do not need Node.js or Rust. The bundled engine is KataGo-Eigen. Read `Manual.html` for offline instructions in either language. Source ZIPs do not contain the executable; use the Windows GitHub Actions build to produce it.

Use **Appearance & Sound** in the left panel or **View → Appearance & Sound** in Simple View. Settings open in an independent, resizable window. Preview changes, Apply to save without closing, or Revert/Close to restore saved preferences. Japanese and English store their text settings separately.

- Body text: 12/14/16/18px; prominent text: 14/16/18/20px; help: 12/12/14/16px.
- Normal button height: 24/26/28/30px, padding 3px.
- Choose or enter an installed font family. Missing fonts fall back to the system font.
- Board labels: 80/100/120%; themes: Warm wood / Paper / Night; custom colors and images.
- Graph colors, 1–4px line widths in 0.5px increments, solid/dashed lines.
- Three original synthesized stone sounds, or a WAV file; volume 0–100%; separate move/navigation/autoplay options. PV hover is silent.

Images: PNG/JPEG/WebP up to 8 MB, resized to at most 512px. WAV: up to 1 MB. Large text may wrap or require scrolling. The graph's move axis uses numeric labels with collision avoidance and 25-move ruler ticks.

The Windows package contains the EXE, engines, READMEs, Manual.html, LICENSE.txt, license pages and notices, and SHA256.txt. App assets are embedded in the EXE.

Author-owned portions use the MIT license, allowing commercial use, modification and redistribution with the copyright and permission notice retained. Third-party components retain their own licenses. See LICENSE.txt and THIRD_PARTY_NOTICES.md.

This is a pre-release validation build. Final third-party notice verification and actual Windows testing remain required before public distribution. No professional games or tsumego are included as sample material. The Manual currently uses text instructions without game screenshots.

Repository: https://github.com/hebaeba/GoKifuStudio

## Update101 controls

Appearance & Sound and Keyboard Shortcuts are in the left panel. Apply saves without closing. Select an installed Windows font or enter its family name and press Enter. Shaded, flat and image stones each offer three original presets per color, plus custom image import.

The radio button at each engine row's right selects the next startup engine. The shared up/down pair moves the selected row. Missing startup registrations or files produce a warning. The initial startup choice is bundled KataGo-Eigen.
