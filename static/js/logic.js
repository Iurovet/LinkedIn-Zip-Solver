// Run at the start
document.addEventListener('DOMContentLoaded', () => {
    setDimensions(6); // Default dimensions 6x6
    initialiseCells(); // Remove all cells and set their behaviour
    initialiseButton(); // Set up button behaviour
});

let editMode = true;
let nextNum = 1;

function initialiseButton () {
  document.getElementById("start").addEventListener("click", () => {
    // Find all radio buttons so that they can all be controlled
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => { // Disable the buttons during solving
      radio.disabled = true;
    });

    // Also prevent "duplcate solving"
    document.getElementById("start").disabled = true;
    
    // Find the table
    const table = document.querySelector('table').tBodies[0];
    let filledCells = [...table.rows].map(row => [...row.cells]);
        
    // Strip away all but 2 attributes (serialisation)
    for (let i = 0; i < filledCells.length; ++i) {
      for (let j = 0; j < filledCells[i].length; ++j) {
        let element = filledCells[i][j];
        filledCells[i][j] = {
          textContent: element.textContent, classList: Array.from(element.classList)
        };
      }
    }
    
    // Send the data (easier if Python figures out which cells aren't in use)
    fetch("/api/send-data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json" // Because this is JSON data
        },
        body: JSON.stringify(filledCells) // Object -> String
    })
    .then(response => response.json())
    .then(data => {
        // Restore solve button
        document.getElementById("start").disabled = false;
    })
    .catch(error => {
        console.error("Error:", error);
    })
    .finally(() => {
      // Re-enable the radio buttons regardless of result
      radioButtons.forEach(radio => {
        radio.disabled = false;
      });
    });
  });
}

function initialiseCells() {
  // Find the table
  const table = document.querySelector('table').tBodies[0];
  const rows = table.rows;
  
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

        // Cannot solve unless there's a number 1 somewhere
        document.getElementById("start").disabled = nextNum <= 1;
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
  // Find the table
  const table = document.querySelector('table').tBodies[0];
  const rows = table.rows;
  
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
  
  // Find the table
  const table = document.querySelector('table').tBodies[0];
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