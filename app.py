import json
import time
from flask import Flask, render_template, Response, request, stream_with_context

# Initialize the Flask application
app = Flask(__name__)

# Define a route for the root URL
@app.route('/')
def hello_world():
    return render_template('index.html')

@app.route('/api/generate-path', methods=['POST'])
def solvePuzzle():
    # Get the data
    data = request.json
    filledCells, direction, delay = data['filledCells'], data['pathType'], data["delay"]

    # Set all visited statuses to false
    for i in range(0, len(filledCells)):
        for j in range(0, len(filledCells[i])):
            filledCells[i][j]['visited'] = False

    # Whilst JS already handles this, make sure the checkpoint numbers go
    # from 1 to n without any gaps (n is how many cells the user added).
    checkpoints = sorted([
        item["checkpoint"]
        for row in filledCells
        for item in row
        if item["checkpoint"] is not None
    ])

    # Likewise the start and end should be different cells
    if len(checkpoints) < 2 or checkpoints != list(range(1, len(checkpoints) + 1)):
        message = "Error: Need at least 2 cells with continuous numbering"
        path = [{'x': -1, 'y': -1, 'message': message}]
    else:
        path = findPath(filledCells, *findCheckpoint(filledCells, 1), [], [])[1]
    
    # Get the path (allow both directions, one of which produces quirky
    # but ultimately correct results).
    def returnPath(path, direction, delay):
        for index, p1 in enumerate(path if direction else reversed(path)):
            # Mention nonsensicality then output to frontend
            if not direction:
                p1['message'] = "[REVERSE, will be nonsensical] " + p1['message']
            yield (json.dumps(p1, ensure_ascii=False) + "\n").encode('utf-8')
            
            # Ensures no delay when clicking the start button (unless the
            # particular path is intractable) nor after the last cell is placed
            if index < len(path)-1:
                # User-set parameter, but not editable "live"
                time.sleep(delay)

    return Response(
        stream_with_context(returnPath(path, direction, delay)),
        mimetype='application/json'
    )

def backtrack(path, path_good):
    # If there is already a known good cell (at time of decision), go to that one.
    # Otherwise no need to waste another line saying "backtrack".
    if len(path_good) >= 2:
        # Pop the bad cell out, 
        path_good.pop()
        oldCell = path_good[-1]

        # In case this is a checkpoint, which will be in order.
        # As the word checkpoint is 9-characters long (and has a space
        # after that, the number is 11 indices past the word).
        message = "Backtracking"
        checkpointNo = oldCell['message'].find("checkpoint")
        if "checkpoint" in oldCell['message']:
            message += " - checkpoint " + oldCell['message'][checkpointNo+11:]

        path.append({**oldCell, "message": message})

    return path, path_good

def findCheckpoint(filledCells, num):
    return next(
        (r, c)
        for r, row in enumerate(filledCells)
        for c, item in enumerate(row)
        if item.get("checkpoint") == num
    )

def findPath(filledCells, r, c, path, path_good):
    # Initialize constants
    size = len(filledCells)
    total = size ** 2
    
    # Mark current cell as visited
    filledCells[r][c]['visited'] = True
    visitedNo = sum(cell['visited'] is True for row in filledCells for cell in row)

    # Log the move
    message = "Visiting (" + str(r) + ", " + str(c) + ")"
    if filledCells[r][c]['checkpoint'] is not None:
        message += " - checkpoint " + str(filledCells[r][c]['checkpoint'])
    
    path.append({'x': r, 'y': c, 'message': message})
    path_good.append({'x': r, 'y': c, 'message': message})

    # Reached the final checkpoint
    if filledCells[r][c] == max(
        (item for row in filledCells for item in row if item['checkpoint'] is not None),
        key=lambda x: x.get('checkpoint', 0)
    ):
        # Check whether all cells have been visited
        path[-1]['message'] += " (found a complete path)" if visitedNo == total else " (not all cells were used)"
        
        if visitedNo != total:
            # Backtrack and record as such
            filledCells[r][c]['visited'] = False
            path, path_good = backtrack(path, path_good)
            
        return visitedNo == total, path, path_good

    # Check if a checkpoing was reached in the checkpoint
    if filledCells[r][c]['checkpoint'] is not None:
        checkpoints = [d for row in filledCells for d in row if d.get("checkpoint") is not None]
        if any(d["checkpoint"] < filledCells[r][c]['checkpoint'] and not d["visited"] for d in checkpoints):
            # Backtrack and record as such
            filledCells[r][c]['visited'] = False
            path[-1]['message'] += " (wrong order)"
            path, path_good = backtrack(path, path_good)
            
            return False, path, path_good
    
    # DFS Exploration
    neighbours = [(r + dr, c + dc) for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)] if 0 <= r + dr < size and 0 <= c + dc < size]
    for n1 in neighbours:
        if not filledCells[n1[0]][n1[1]]['visited']:
            if findPath(filledCells, *n1, path, path_good)[0]:
                return True, path, path_good

    # Backtrack and record dead ends as such
    filledCells[r][c]['visited'] = False
    path[-1]['message'] += " (no more unvisited neighbours)"

    # No solution if back to the start
    if len(path_good) == 1:
        path[-1]['message'] = path[-1]['message'].replace("neighbours)", "neighbours - no solutions)")

    path, path_good = backtrack(path, path_good)

    return False, path, path_good

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)
