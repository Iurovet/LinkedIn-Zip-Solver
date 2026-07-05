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
    numbers = [
        item["checkpoint"]
        for row in data
        for item in row
        if item["checkpoint"] is not None
    ]
    print(numbers)
    
    # Likewise the start and end should be different cells
    if len(numbers) < 2 or sorted(numbers) != list(range(1, len(numbers) + 1)):
        return Response(
            stream_with_context(
                errorMessage("Need at least 2 cells with continuous numbering")
            ),
            mimetype='application/json'
        )

    def generate_dfs():
        # Explore all unvisited cells
        for i in range(0, len(data)):
            for j in range(0, len(data[i])):
                if not data[i][j]['visited']:
                    # Default size for now
                    yield from dfs(data, i, j)
    
    return Response(
        stream_with_context(generate_dfs()),
        mimetype='application/json'
    )

def dfs(data, r, c):
    # Mark cell as visited
    data[r][c]['visited'] = True
    
    # Set the size as the side length (assume graph is square-shaped)
    size = len(data)
    
    try:
        # Progressively send the data back to the frontend
        yield (json.dumps({'x': r, 'y': c}) + "\n").encode('utf-8')

        neighbours = [(r + dr, c + dc) for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)] if 0 <= r + dr < size and 0 <= c + dc < size]
        for n1 in neighbours:
            if not data[n1[0]][n1[1]]['visited']:
                yield from dfs(data, n1[0], n1[1])
    except Exception as e:
        # Using The yield keyword alone will cause some throws
        yield from errorMessage(str(e))

# Generic error message
def errorMessage(message):
    yield (json.dumps({'error': message}) + "\n").encode('utf-8')

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)
