async function sendData(filledCells) {
  try {
    // Initiate the streaming request
    const response = await fetch('/api/generate-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filledCells)
    });

    // Read the stream progressively
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // Handle streaming data line by line
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the incomplete line in the buffer
      
      for (const line of lines) {
        console.log('New message:', JSON.parse(line));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/* Run at the start (start by finding the table).
 * Declare the variables here so that any function can see them.
*/
let table, rows;
document.addEventListener('DOMContentLoaded', () => {
    table = document.querySelector('table').tBodies[0];
    rows = table.rows;
  
    initialiseButton(); // Set up button behaviour
    initialiseCells(); // Remove all cells and set their behaviour
    setDimensions(6); // Default dimensions 6x6
});

let editMode = true;
let nextNum = 1;

function initialiseButton() {
  document.getElementById("start").addEventListener("click", () => {
    // Find all radio buttons so that they can all be controlled
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => { // Disable the buttons during solving
      radio.disabled = true;
    });

    // Also prevent "duplcate solving"
    document.getElementById("start").disabled = true;
    
    // Intitialise a 2D graph
    let currCells = [...table.rows].map(row => [...row.cells]);
    let filledCells = [];

    // Create a new 2D graph
    for (let i = 0; i < currCells.length; ++i) {      
      // Check for end of row
      if (rows[i].style.display !== "") { break; }
      
      // New row
      filledCells.push([]);
      
      for (let j = 0; j < currCells[i].length; ++j) {
        let element = currCells[i][j];
        
        // Check for end of column
        if (element.style.display !== "") { break; }

        // New column, with null = no checkpoint
        filledCells[i].push({
          checkpoint: element.textContent !== "" ? parseInt(element.textContent) : null
        });
      }
    }

    // Send the data
    sendData(filledCells);

    // Re-enable everything
    radioButtons.forEach(radio => {
      radio.disabled = false;
    });

    // Also prevent "duplcate solving"
    document.getElementById("start").disabled = false;
  });
}

function initialiseCells() {
  // Look for individual elements
  for (let i = 0; i < rows.length; i++) {
    const columns = rows[i].cells;

    for (let j = 0; j < columns.length; j++) {
      // Remove everything from the start
      columns[j].classList.remove('circle');
      columns[j].textContent = "";

      // Click functionality
      columns[j].addEventListener('click', function() {
        /* Make sure editing the grid does nothing whilst attempting to solve, where
         * the main sign of such is the disabled radio buttons (and only then is the
         * solve button rendered inoperative, so as not to permanently lock someone
         * out of pressing it).
        */
        if (document.querySelector('input[type="radio"]:disabled') !== null) {
          return;
        }

        // Show the circle (if not already there) and increment the next number
        if (editMode && !this.classList.contains('circle')) {
          this.classList.add('circle');
          this.textContent = String(nextNum);
          nextNum++;
        }

        // Hide the circle and decrement the number
        else if (!editMode && this.classList.contains('circle')) {
          this.classList.remove('circle');

          let currNumber = parseInt(this.textContent);
          this.textContent = ""; // Remove the current number

          updateNumbers(currNumber); // All higher elements get reduced by one
          nextNum--;
        }

        // Cannot solve unless there are 2 different cells
        document.getElementById("start").disabled = nextNum <= 2;
      });
    }
  }
}

// Set cells to either add (true) or remove (false)
function setEditMode(value){
  editMode = value;
}

// Sets table size to a square of side length 5, 6, 7 or 8
function setDimensions(size) {
  for (let i = 0; i < rows.length; i++) {
    // Check if the row needs to be hidden
    rows[i].style.display = (i >= size) ? 'none' : '';
      
    // Separately hide the columns in every row
    const columns = rows[i].cells;
    for (let j = 0; j < columns.length; j++) {
      columns[j].style.display = (j >= size) ? 'none' : '';
      
      // If the cell is now hidden (row or column), delete it
      if (rows[i].style.display === 'none' || columns[j].style.display === 'none') {
        setEditMode(false); // Temporarily allow deletion of cells
        columns[j].click(); // Simulate a click
        setEditMode(true);
      }
    }
  }
}

function updateNumbers(currNum) {
  /* Find where a cell is filled in and sort it by number (assuming it
   * exists, hence why the array must be flattened first). Using numeric
   * ensures behaviour of the type [1, 2, 10], rather than [1, 10, 2] in terms
   * of what textContent is equal to.
  */
  const filledCells = [...table.rows].map(row => [...row.cells])
  .flat().filter(el => 
    el.textContent !== "" && el.classList.contains('circle')
  ).sort((a, b) => 
    a.textContent.localeCompare(b.textContent, undefined, { numeric: true })
  );

  /* There should be a gap of 1 precisely where an element was removed.
   * Any cell above that number should be decremented by 1 to fill said gap.
  */
  filledCells.forEach(element => {
    if (parseInt(element.textContent) > currNum) {
      element.textContent = (parseInt(element.textContent, 10) - 1).toString();
    }
  })
}