import json
import time
from flask import Flask, render_template, Response, request, stream_with_context

# Initialize the Flask application
app = Flask(__name__)

# Global variables to simplify variable passing
graph, path, path_good = [], [], []

# Define a route for the root URL
@app.route('/')
def hello_world():
    return render_template('index.html')

@app.route('/api/generate-path', methods=['POST'])
def solvePuzzle():
    # Get the data
    data = request.json
    global graph, path
    graph, direction, delay, warnsdorff = data['graph'], data['pathType'], data["delay"], data['warnsdorff']

    # Set all visited statuses to false
    for i in range(0, len(graph)):
        for j in range(0, len(graph[i])):
            graph[i][j]['visited'] = False

    # Whilst JS already handles this, make sure the checkpoint numbers go
    # from 1 to n without any gaps (n is how many cells the user added).
    checkpoints = sorted([
        item["checkpoint"]
        for row in graph
        for item in row
        if item["checkpoint"] is not None
    ])

    # Likewise the start and end should be different cells
    if len(checkpoints) < 2 or checkpoints != list(range(1, len(checkpoints) + 1)):
        message = "Error: Need at least 2 cells with continuous numbering"
        path = [{'x': -1, 'y': -1, 'message': message}]
    else:
        # Clear both paths first
        path, path_good = [], []
        findPath(*findCheckpoint(graph, 1), warnsdorff)
    
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

def backtrack():
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

def findCheckpoint(graph, num):
    return next(
        (r, c)
        for r, row in enumerate(graph)
        for c, item in enumerate(row)
        if item.get("checkpoint") == num
    )

def findPath(r, c, warnsdorff):
    # Initialize constants
    size = len(graph)
    total = size ** 2
    
    # Mark current cell as visited
    graph[r][c]['visited'] = True
    visitedNo = sum(cell['visited'] is True for row in graph for cell in row)

    # Log the move
    message = "Visiting (" + str(r) + ", " + str(c) + ")"
    if graph[r][c]['checkpoint'] is not None:
        message += " - checkpoint " + str(graph[r][c]['checkpoint'])
    
    path.append({'x': r, 'y': c, 'message': message})
    path_good.append({'x': r, 'y': c, 'message': message})

    # Reached the final checkpoint
    if graph[r][c] == max(
        (item for row in graph for item in row if item['checkpoint'] is not None),
        key=lambda x: x.get('checkpoint', 0)
    ):
        # Check whether all cells have been visited
        path[-1]['message'] += " (found a complete path)" if visitedNo == total else " (not all cells were used)"
        
        if visitedNo != total:
            # Backtrack and record as such
            graph[r][c]['visited'] = False
            backtrack()

        return visitedNo == total

    # Check if a checkpoing was reached in the checkpoint
    if graph[r][c]['checkpoint'] is not None:
        checkpoints = [d for row in graph for d in row if d.get("checkpoint") is not None]
        if any(d["checkpoint"] < graph[r][c]['checkpoint'] and not d["visited"] for d in checkpoints):
            # Backtrack and record as such
            graph[r][c]['visited'] = False
            path[-1]['message'] += " (wrong order)"
            backtrack()
            
            return False
    
    # DFS Exploration
    neighbours = [(r + dr, c + dc) for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)] if 0 <= r + dr < size and 0 <= c + dc < size]
    
    # Visit unvisited neighbours in ascending order of their neighbour count
    degrees = [0] * len(neighbours)
    if warnsdorff:
        for index, n1 in enumerate(neighbours):
            if not graph[n1[0]][n1[1]]['visited']:
                # Add one to each unvisited orthogonal neighbour in-bounds
                degrees[index] = sum(
                    1 for ddr, ddc in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                    if 0 <= n1[0] + ddr < size and 0 <= n1[1] + ddc < size 
                    and not graph[n1[0] + ddr][n1[1] + ddc]['visited']
                )
        # Sort degrees in ascending order then sort neighbours by these indices
        degrees = sorted(range(len(degrees)), key=lambda i: neighbours[i])
        neighbours = [neighbours[i] for i in degrees]

    for n1 in neighbours:
        if not graph[n1[0]][n1[1]]['visited']:
            if findPath(*n1, warnsdorff):
                return True

    # Backtrack and record dead ends as such
    graph[r][c]['visited'] = False
    path[-1]['message'] += " (no more unvisited neighbours)"

    # No solution if back to the start
    if len(path_good) == 1:
        path[-1]['message'] = path[-1]['message'].replace("neighbours)", "neighbours - no solutions)")
    backtrack()

    return False

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)
