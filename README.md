# Please note: This is for skill development only, not for cheating and/or getting a really low time on the actual puzzle (which should be impossible, anyway, due to brute-force and delays)
- You could instead create hypothetical puzzles, or take one you've solved and see the process/verify the solution

# Setup:
- Clone this repo (git clone https://github.com/Iurovet/LinkedIn-Zip-Solver)
- Install Python (version 3.x) and WSL

## Running the project:
- cd into mnt then into whatever path you've cloned the repo into
- python3 -m venv .venv (only required the 1st time after (re-)cloning)
- pip install Flask
- source .venv/bin/activate
- python3 app.py

# Features include:
- Set size between 5 and 8 (assume square matrices, as in the real thing)
- Set edit mode to add, remove or off
- Set Forward or reverse direction (the latter is quirky and won't line up with any logging, but ultimately leads to the right solution)
- Hotkeys for the above
- Console-logging the decisions
- Graphing the path with delay (user-set: 0.1-5s), which comes from the backend to minimise access to the internal workings (and potentially a solution)
- Change the colour/stroke width above in real-time
- Show length of solving time (in seconds) in case the path is intractable (takes too long to solve)
- Duplicate the decisions onto the frontend (but more similar to lights on an arcade machine, if that's the right analogy). Won't quite work for the reverse direction, though (and may need updating)

# Future features:
- Manually drawing/erasing walls and having Python use neural networks to detect where they were drawn (then shown on the screen)
- Investigating/implementing heuristics to allow the path to be solved more quickly

# No longer in scope
- Changing the delay live in real-time: Even if the minimum delay isn't "fast" per-se (or there's a lot of backtracking), changing the delay live somewhat goes against the purpose of not being able to cheat. Plus, I wasn't even able to implement it in the current stack (HTML/CSS/JS frontend, Python-Flask backend)