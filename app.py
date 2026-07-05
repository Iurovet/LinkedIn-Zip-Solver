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
        return Response(
            stream_with_context(
                logMessage("Need at least 2 cells with continuous numbering")
            ),
            mimetype='application/json'
        )

    # Currently inherently faulty as yield cannot coexist with return,
    # at least not in this implementation
    def find_path(data, currCell):
        # Number of cells with visited = true
        visitedNo = sum(cell.get('visited') is True for row in data for cell in row)

        # Assume the grid is square-shaped
        size = len(data) ** 2

        # Reached the final checkpoint, check if all other cells filled in
        if currCell == max(
            (item for row in data for item in row if item['checkpoint'] is not None),
            key=lambda x: x.get('checkpoint', 0)
        ):
            yield from logMessage(
                "Success: Found a path" if visitedNo == size else "Error: Not all cells were used"
            )

            # Undo
            if visitedNo != size:
                r, c = [(r, c) for r, row in enumerate(data) for c, item in enumerate(row) if item == currCell][0]
                yield (json.dumps({'x_reverse': r, 'y_reverse': c}) + "\n").encode('utf-8')
                data[r][c]['visited'] = False

        # Found a checkpoint
        if currCell['checkpoint'] is not None:
            # Look at checkpoint cells only
            checkpoints = [
                d for row in data for d in row
                if d.get("checkpoint") is not None
            ]
            
            # Make sure that there aren't prior, unvisited checkpoints
            if any(d["checkpoint"] < currCell['checkpoint'] and not d["visited"] for d in checkpoints):
                yield from logMessage("Error: Checkpoints visited in the wrong order")
                
                # Undo
                r, c = [(r, c) for r, row in enumerate(data) for c, item in enumerate(row) if item == currCell][0]
                yield (json.dumps({'x_reverse': r, 'y_reverse': c}) + "\n").encode('utf-8')
                data[r][c]['visited'] = False
        
        # Current indices
        r, c = next(
            (r, c)
            for r, row in enumerate(data)
            for c, item in enumerate(row)
            if item == currCell
        )

        # Current cell is OK
        yield (json.dumps({'x': r, 'y': c}) + "\n").encode('utf-8')
        
        # DFS exploration
        neighbours = [(r + dr, c + dc) for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)] if 0 <= r + dr < size and 0 <= c + dc < size]
        for n1 in neighbours:
            if not data[n1[0]][n1[1]]['visited']:
                print(n1, data[n1[0]][n1[1]])
                data[n1[0]][n1[1]]['visited'] = True
                find_path(data, n1)
                print(n1, data[n1[0]][n1[1]])
        
        # In case the final checkpoint was found without visiting all cells
        yield from logMessage("Information: Attempting to add more cells to the path."
                              "Else if this is the top of the call stack, no solutions.")

    # Find the path, assuming that the graph is square-shaped.
    # Start from checkpoint 1
    return Response(
        stream_with_context(
            find_path(data, findCheckpoint(data, 1))
        ),
        mimetype='application/json'
    )

def findCheckpoint(data, num):
    r, c = next(
        (r_idx, c_idx)
        for r_idx, row in enumerate(data)
        for c_idx, item in enumerate(row)
        if isinstance(item, dict) and item.get("checkpoint") == num
    )
    return data[r][c]

# Generic logging function
def logMessage(message):
    yield (json.dumps({'error': message}) + "\n").encode('utf-8')

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)
