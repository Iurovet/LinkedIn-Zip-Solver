# Please note: This is for skill development only, not for cheating and getting a really low time on the actual puzzle (which should be impossible, anyway, due to brute-force and delays).

# Setup:
- Clone this repo (git clone https://github.com/Iurovet/LinkedIn-Zip-Solver)
- Install Python (version 3.x) and WSL

## Running the project:
- cd into mnt then into whatever path you've cloned the repo into
- python3 -m venv .venv (only required the 1st time after (re-)cloning)
- source .venv/bin/activate
- python3 app.py

# Features include:
- Set size between 5 and 8 (assume square matrices, as in the real thing)
- Set edit mode to add, remove or off
- Set Forward or reverse direction (the latter is quirky and won't line up with logging, but ultimately leads to the right solution)
- Hotkeys for the above
- Console-logging the decisions
- Graphing the path with delay

# Future features:
- Change the delay time, as well as the colour/stroke width of the graph line (all live)
- Duplicate the decisions onto the frontend (but more similar to lights on an arcade machine, if that's the right analogy)
- Manually drawing walls and having Python use neural networks to detect where they were drawn
