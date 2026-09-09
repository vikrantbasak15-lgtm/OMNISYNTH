# OmniSynth

> A local-first, browser-based music studio for designing sounds, writing patterns, recording samples, and exporting ideas without installing a traditional DAW.

OmniSynth is an experimental web instrument built with React, TypeScript, and the Web Audio API. It brings a subtractive synthesizer, step sequencer, sampler, mixer, visual analysers, and browser-based export tools into one focused creative workspace.

Audio processing happens in the browser. Your patterns, patches, recordings, and audio previews stay on your device unless you explicitly download or share a project.

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Using OmniSynth](#using-omnisynth)
- [Keyboard controls](#keyboard-controls)
- [Export and import](#export-and-import)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Browser support](#browser-support)
- [Local data and privacy](#local-data-and-privacy)
- [Current limitations](#current-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

### Synth and sound design

- Dual-oscillator subtractive synth with sine, sawtooth, square, and triangle waveforms
- Filter cutoff and resonance controls
- Detune, attack, release, drive, and echo controls
- Built-in starter patches including pads, basses, plucks, and lead-style sounds
- Smart patch prompt helper for fast sound starting points
- Live on-screen piano keyboard and computer-keyboard performance
- Chord pads and optional arpeggiated chord playback

### Sequencing and composition

- 16-step melodic sequencer
- Individual note, on/off, and velocity editing per step
- 16-step kick, snare, and hi-hat drum patterns
- Pattern banks for starter, house, acid, and ambient ideas
- Tap tempo, transpose, random variation, and clear controls
- Scale-aware melody generator with major, minor, and pentatonic modes
- Chord-progression generator
- Undo and redo for melodic pattern edits

### Samples, recording, and drums

- Import an audio file into the sampler
- Pitch-map a loaded sample from C to G
- Record OmniSynth’s own output directly into the sampler
- Capture a microphone recording directly into the sampler (with browser permission)
- Four-bar sample looper
- Kick, snare, clap, and hi-hat audition pads

### Visualisation and mixing

- Real-time oscilloscope for the master output
- Live spectrum analyser and level readout
- Master volume, synth-bus level, drum-bus level, drive, and echo controls
- Three-track session overview for synth, drums, and sample playback

### Projects and files

- Autosaved browser session using local storage
- Named local project snapshots/version checkpoints
- Save/download OmniSynth project JSON files
- Export a local WAV mixdown
- Export a local MP3 mixdown
- Export the melody as a Standard MIDI file
- Import MIDI patterns into the sequencer
- Custom preset saves and preset favourites
- Light/dark theme preference
- Local-room project sharing via `BroadcastChannel` where supported

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later recommended
- npm (included with Node.js)
- A modern desktop browser. Chrome or Edge is recommended for the broadest Web Audio and MIDI support.

### Install and run

```powershell
git clone https://github.com/YOUR-USERNAME/omnisynth.git
cd omnisynth
npm install
npm run dev
```

Open the local URL printed by Vite, normally:

```text
http://localhost:5173
```

### Create a production build

```powershell
npm run build
npm run preview
```

`npm run build` type-checks the project and writes an optimized static site to `dist/`.

## Using OmniSynth

### Make your first sound

1. Click **Start making sound** or press a piano key in the interface. Browsers require a user interaction before audio can start.
2. Choose a patch from the patch library, or write a description in the smart patch helper.
3. Shape the sound with waveform, cutoff, resonance, detune, attack, release, and drive.
4. Press **Play pattern** to hear the current sequence.

### Write a beat and melody

1. Click cells in the melodic sequencer to enable or mute notes.
2. Use the step editor to select a step and refine its MIDI note and velocity.
3. Program kick, snare, and hi-hat cells in their drum lanes.
4. Try a pattern bank, generate a variation, or use the scale melody and chord tools in **Expanded Studio Tools**.

### Load or record a sample

1. Open **Expanded Studio Tools → Sound**.
2. Choose **Import audio sample** and select an audio file, or use the studio/microphone record buttons.
3. Use the C and G sample buttons to audition pitch-mapped playback.
4. Enable the four-bar looper to repeat the sample while the transport is playing.

### Save a project

- **Save locally** creates a local browser snapshot and keeps the latest session available after a refresh.
- **Download project** exports a portable `.omnisynth.json` project file.
- Use **Export project** or the **Files** panel when you want a downloadable audio or MIDI file.

## Keyboard controls

| Control | Action |
| --- | --- |
| `A`–`K` | Play the currently selected octave on the synth |
| `Z` / `X` | Move the computer-keyboard octave down/up |
| `Space` | Start or stop the sequencer transport |
| On-screen piano | Click or tap a note to play it |

Keyboard shortcuts are ignored while typing into a text field or editing a number input.

## Export and import

| Format | What it does | Notes |
| --- | --- | --- |
| `.omnisynth.json` | Saves pattern, patch, mixer, and project settings | Use this to move an OmniSynth session between browsers/devices manually. |
| `.wav` | Exports an offline-rendered local audio mixdown | Best for editing in another audio program. |
| `.mp3` | Exports a compressed local audio mixdown | Convenient for sharing previews. |
| `.mid` | Exports the melodic 16-step pattern as Standard MIDI | Drum lanes are not currently represented as MIDI tracks. |
| MIDI import | Loads a compatible MIDI pattern into the melodic sequencer | Optimised for simple note-pattern MIDI files. |

## Tech stack

- **React** — interface and state management
- **TypeScript** — application code and type safety
- **Vite** — development server and production builds
- **Web Audio API** — synthesis, effects, analyser data, recording, and audio playback
- **Web MIDI API** — optional MIDI keyboard input
- **MediaRecorder** — studio-output and microphone recording
- **lamejs** — browser-side MP3 encoding
- **Canvas API** — oscilloscope and spectrum display
- **LocalStorage** — local session autosave and project snapshots

## Project structure

```text
omnisynth/
├── src/
│   ├── audio/
│   │   ├── SynthEngine.ts     # Web Audio synth, drum voices, buses, analyser, sampler
│   │   ├── exporters.ts       # Offline WAV, MP3, and MIDI export/import helpers
│   │   └── types.ts           # Patch and sequence types/defaults
│   ├── App.tsx                # Studio, Library, Learn, and expanded tool UI
│   ├── main.tsx               # React entry point and stylesheet imports
│   ├── *.css                  # Responsive visual system and studio panels
│   └── lamejs.d.ts            # Local TypeScript declaration for lamejs
├── docs/                      # Project documentation/assets, if present
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Browser support

OmniSynth relies on browser media APIs, so feature availability varies.

| Capability | Recommended browser support |
| --- | --- |
| Synth, sequencer, effects, scope, WAV export | Current Chrome, Edge, Firefox, Safari |
| Microphone recording | Current Chrome, Edge, Firefox, Safari, after permission approval |
| MIDI keyboard input | Chrome and Edge are recommended; availability depends on browser/device support |
| MP3 export | Modern browsers with required typed-array support |
| Local-room sharing | Browsers supporting `BroadcastChannel`; it is designed for the same browser profile/device |

Use HTTPS when deployed. Microphone access, MIDI, and other device features are often restricted on non-secure sites, except on `localhost` during development.

## Local data and privacy

OmniSynth is designed to be local-first:

- Audio synthesis and playback happen in your browser.
- The current session and project checkpoints are saved in browser `localStorage`.
- Recording a microphone requires an explicit browser permission prompt.
- Imported/recorded sample audio is held in the active browser session; it is not uploaded by this project.
- Downloaded project/audio files are created by your browser.

Clearing this site’s browser data will remove local session data and saved checkpoints. Download important projects as `.omnisynth.json` files before clearing browser storage.

## Current limitations

This repository is a working local-first music tool, not yet a cloud DAW. In particular:

- Local project autosave is tied to one browser profile/device.
- Local-room sharing uses browser messaging, not an internet collaboration server.
- The sampler is a single loaded sample, not a full multi-zone sampler.
- The MIDI importer is aimed at straightforward note patterns, not every multi-track MIDI arrangement.
- Audio exports are offline renders of the current pattern; they are not a full multi-track arrangement renderer.
- AI music generation, stem separation, accounts, paid plans, cloud backups, and global collaboration require separate backend/API services and are not claimed as working in this local build.

## Roadmap

Contributions and issue discussions are welcome around:

- More instrument and drum voices
- Multiple synth/sample tracks and a full timeline arrangement
- Swing, automation lanes, sidechain, EQ, reverb, chorus, and phaser effects
- Better MIDI import/export with drum and multi-track support
- Drag-and-drop effect rack and modular routing
- Offline project-file import
- Optional cloud authentication and project sync
- Collaboration rooms backed by a server
- Accessible keyboard navigation and additional responsive/mobile improvements
- Comprehensive tests for audio/export behavior

## Contributing

1. Fork this repository.
2. Create a branch for your change:

   ```bash
   git checkout -b feature/short-description
   ```

3. Install dependencies and run the app with `npm run dev`.
4. Run `npm run build` before opening a pull request.
5. Keep pull requests focused, describe the user-facing behavior, and include screenshots or a short recording for UI changes where helpful.

Please do not commit `node_modules`, generated `dist` files, `.env` files, API credentials, or private recordings.

## License

Choose and add a license before publishing the repository. If the goal is broad adoption and community contributions, the MIT License is a common choice. If you want hosted modifications to remain open source, consider AGPL-3.0 and get legal advice appropriate to your project and location.

Until a `LICENSE` file is added, this repository is **not automatically open source** and other people do not have permission to reuse the code.

---

Built for quick musical sketches, sound experiments, and learning by making noise.
