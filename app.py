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
    
    # Assume a default size of 0 in case the attribute cannot be calculated
    size = 0
    for i in range(7, 3, -1):
        # Found size
        if data[i][i]['display']:
            size = i + 1
            break

        # Decrement the dimensions by 1 and continue searching
        data = [row[:-1] for row in data[:-1]]
    
    # If size not determined, yield error
    if size == 0:
        def badSize():
            yield (json.dumps({'error': "Size could not be determined"}) + "\n").encode('utf-8')
        
        return Response(
            stream_with_context(badSize()),
            content_type='application/json'
        )
    else:
        # Set all visited statuses to false
        for i in range(0, len(data)):
            for j in range(0, len(data[i])):
                data[i][j]['visited'] = False

        def generate_dfs():
            # Explore all unvisited cells
            for i in range(0, len(data)):
                for j in range(0, len(data[i])):
                    if not data[i][j]['visited']:
                        yield from dfs(data, i, j, size)
        
        return Response(
            stream_with_context(generate_dfs()),
            mimetype='application/json'
        )

def dfs(data, r, c, size):
    # Mark cell as visited
    data[r][c]['visited'] = True

    try:
        # Progressively send the data back to the frontend
        yield (json.dumps({'x': r, 'y': c}) + "\n").encode('utf-8')

        neighbours = [(r + dr, c + dc) for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)] if 0 <= r + dr < size and 0 <= c + dc < size]
        for n1 in neighbours:
            if not data[n1[0]][n1[1]]['visited']:
                yield from dfs(data, n1[0], n1[1], size)
    except Exception as e:
        # The yield keyword alone will throw this
        yield (json.dumps({'error': str(e)}) + "\n").encode('utf-8')

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)
