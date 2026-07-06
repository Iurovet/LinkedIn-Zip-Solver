import json
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

    # Set all visited statuses to false
    for i in range(0, len(data)):
        for j in range(0, len(data[i])):
            data[i][j]['visited'] = False

    # Whilst JS already handles this, make sure the checkpoint numbers go
    # from 1 to n without any gaps (n is how many cells the user added).
    checkpoints = sorted([
        item["checkpoint"]
        for row in data
        for item in row
        if item["checkpoint"] is not None
    ])

    # Likewise the start and end should be different cells
    if len(checkpoints) < 2 or checkpoints != list(range(1, len(checkpoints) + 1)):
        message = "Error: Need at least 2 cells with continuous numbering"
        path = [{'x': -1, 'y': -1, 'message': message, 'reverse': False}]
    else:
        path = findPath(data, *findCheckpoint(data, 1), [])[1]
    
    # Get the path
    def returnPath(path):
        for p1 in path:
            r, c = p1['x'], p1['y']
            print((r, c), p1)
            yield (json.dumps(p1, ensure_ascii=False) + "\n").encode('utf-8')
    
    return Response(
        stream_with_context(returnPath(path)),
        mimetype='application/json'
    )

def findCheckpoint(data, num):
    return next(
        (r, c)
        for r, row in enumerate(data)
        for c, item in enumerate(row)
        if isinstance(item, dict) and item.get("checkpoint") == num
    )

# Sends data to the frontend but may still be faulty
def findPath(data, r, c, path):
    # Initially mark this cell as visited and initialise some data
    data[r][c]['visited'] = True
    total = len(data) ** 2
    visitedNo = sum(cell.get('visited') is True for row in data for cell in row)

    # Reached the final checkpoint, check if all other cells filled in
    if data[r][c]['checkpoint'] == max(
        (item for row in data for item in row if item['checkpoint'] is not None),
        key=lambda x: x.get('checkpoint', 0)
    ):
        # Log the result
        message = "Success: Found a path" if visitedNo == total else "Error: Not all cells were used"
        path.append({'x': r, 'y': c, 'message': message, 'reverse': visitedNo != total})

        # Undo
        if visitedNo != total:
            data[r][c]['visited'] = False

        return visitedNo == total, path

    # Found a checkpoint
    if data[r][c]['checkpoint'] is not None:
        # Look at checkpoint cells only
        checkpoints = [
            d for row in data for d in row
            if d.get("checkpoint") is not None
        ]

        # Make sure that there aren't prior, unvisited checkpoints
        if any(d["checkpoint"] < data[r][c]['checkpoint'] and not d["visited"] for d in checkpoints):
            # Log the result
            message = "Error: Checkpoint " + str(data[r][c]['checkpoint']) + " visited in the wrong order"
            path.append({'x': r, 'y': c, 'message': message, 'reverse': True})

            # Undo
            data[r][c]['visited'] = False
            return False, path
    
    message = "New coordinates at (" + str(r) + ", " + str(c) + ")"
    path.append({'x': r, 'y': c, 'message': message, 'reverse': False})

    # DFS exploration (first assume the grid is "square")
    size = len(data)
    neighbours = [(r + dr, c + dc) for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)] if 0 <= r + dr < size and 0 <= c + dc < size]
    
    for n1 in neighbours:
        if not data[n1[0]][n1[1]]['visited']:
            # Current cell is OK
            if findPath(data, *n1, path)[0]:
                return True, path

    # Base-case failure
    message = "Error: No neighbours found"
    path.append({'x': r, 'y': c, 'message': message, 'reverse': True})
    return False, path

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)
