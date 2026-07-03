from flask import Flask, render_template, request, jsonify

# Initialize the Flask application
app = Flask(__name__)

# Define a route for the root URL
@app.route('/')
def hello_world():
    return render_template('index.html')

@app.route('/api/send-data', methods=['POST'])
def solvePuzzle():
    return jsonify({"sizeFound": "0x0"})

if __name__ == '__main__':
    # Run the application in debug mode for development
    app.run(debug=True)