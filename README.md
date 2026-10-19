# 8.04 Companion — MIT Quantum Physics I, Lectures 1–3

Interactive web companion to MIT OCW **8.04 Quantum Physics I** (Prof. Barton Zwiebach, Spring 2016), covering the first three lectures (clips L1.1–L3.4 of the YouTube playlist).

**Live site (once Pages is enabled):** `https://<your-github-username>.github.io/<repo-name>/`

## What is inside

- **Follow-along notes** for each of the 14 clips: embedded (privacy-enhanced) YouTube video, plain-English summary, full equations (MathJax), and a one-line takeaway.
- **7 interactive simulations** (vanilla canvas, no build step): Malus's law with single-photon counting, complex phasor, superposition measurement, Mach–Zehnder interferometer (phase + blocked arm), Elitzur–Vaidman bomb tester, photoelectric effect, Compton scattering, and de Broglie wavelength.
- **Checkpoint quizzes** (15 questions) with instant explanations, plus a per-clip "mark done" progress tracker (localStorage only).
- **Revision mode**: flashcards, a printable one-screen equation sheet, and collapsed explanations.

## Pages

- `index.html` — home: lecture index cards, equation sheet, flashcards.
- `lecture-1.html`, `lecture-2.html`, `lecture-3.html` — one page per lecture, each with its clips, simulations, checkpoints, and prev/next navigation. Sidebar links and progress work across pages.

## Tests

```bash
node --test tests/
```

Covers the simulation canvas-sizing regression: redrawing a simulation (moving any control) must never change the canvas size.

## Run locally

No build step. Serve the folder statically:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` via `file://` also mostly works, but a local server is recommended (embeds, MathJax CDN).

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (it is already a plain static site; `.nojekyll` included).
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Wait for the Pages build, then visit `https://<username>.github.io/<repo>/`.

All paths are relative, so the site works unchanged from a project subpath (`/repo-name/`) or a user site root.

## Content and sources

- Course: [MIT OCW 8.04 Quantum Physics I, Spring 2016](https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/)
- Playlist: [PLUl4u3cNGP60cspQn3N9dYRPiyVWDd80G](https://www.youtube.com/playlist?list=PLUl4u3cNGP60cspQn3N9dYRPiyVWDd80G)
- Lecture mapping follows MIT OCW Part 1: Lecture 1 = L1.1–L1.5, Lecture 2 = L2.1–L2.5, Lecture 3 = L3.1–L3.4.
- Summaries are original paraphrases written from the lectures' YouTube transcripts for study use. They are not transcripts and do not reproduce lecture text at length. Videos are embedded from YouTube; no video or transcript files are hosted here.

### Transcripts note

Transcripts were obtained from YouTube's caption tracks with `yt-dlp --write-auto-subs --sub-langs "en" --skip-download`. All 14 clips had English captions. One clip (L2.3, `0USje5vTIKs`) rate-limited the default track (HTTP 429); its alternate English track downloaded successfully on retry. No other access problems were encountered.

## Extending to later lectures

Add a lecture object to `assets/data.js` (`LECTURES`, `QUIZZES`, `FLASHCARDS`, `SHEET`) and, if needed, a new simulation in `assets/sims.js`. The renderer in `assets/app.js` picks everything up automatically.

## Tech

Static HTML/CSS/JS. MathJax 3 via CDN for equations; everything else (including all simulations) is dependency-free vanilla JS/canvas, so it hosts anywhere static files are served.
