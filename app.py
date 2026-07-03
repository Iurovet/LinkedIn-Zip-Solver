from flask import Flask, render_template, request, jsonify

# Initialize the Flask application
app = Flask(__name__)

# Define a route for the root URL
@app.route('/')
def hello_world():
    return render_template('index.html')

@app.route('/api/send-data', methods=['POST'])
def solvePuzzle():
    # Get the data
    data = request.get_json()
    
    # Assume a default size of 0 in case the attribute cannot be calculated
    size = 0
    for i in range(7, 3, -1):
        if data[i][i]['display']:
            size = i + 1
            break
    
    # If size not determined, throw error
    if size == 0:
        return jsonify({"error": "Size could not be determined"}), 422
    else:
        return jsonify({"size": size})

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)