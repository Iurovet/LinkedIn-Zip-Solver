// Run at the start
document.addEventListener('DOMContentLoaded', () => {
    setDimensions(6); // Default dimensions 6x6
    initialiseCells(); // Remove all cells and set their behaviour
});


let editMode = true;
let nextNum = 1;

function initialiseCells() {
  // Find the table
  const table = document.querySelector('table').tBodies[0];
  const rows = table.rows;
  
  // Look for individual elements
  for (let i = 0; i < rows.length; i++) {
    const columns = rows[i].cells;

    for (let j = 0; j < columns.length; j++) {
      // Remove everything from the start
      columns[j].classList.remove('numerable');
      columns[j].textContent = "";

      // Click functionality
      columns[j].addEventListener('click', function() {
        // Show the circle (if not already there) and increment the next number
        if (editMode && !this.classList.contains('numerable')) {
          this.classList.add('numerable');
          this.textContent = String(nextNum);
          nextNum++;
        }

        // Hide the circle and decrement the number
        else if (!editMode && this.classList.contains('numerable')) {
          this.classList.remove('numerable');

          let currNumber = parseInt(this.textContent);
          this.textContent = ""; // Remove the current number

          updateNumbers(currNumber); // All higher elements get reduced by one
          nextNum--;
        }
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
    el.textContent !== "" && el.classList.contains('numerable')
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