// Run at the start
document.addEventListener('DOMContentLoaded', () => {
    setDimensions(6);
    initialiseCells();
});


let addMode = true;
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
      columns[j].classList.remove('numberable');

      // Click functionality
      columns[j].addEventListener('click', function() {
        // Show the circle and increment the next number
        if (addMode && !(this.classList.contains('numberable'))) {
          this.classList.add('numberable');
          this.textContent = String(nextNum);
          nextNum++;
        }

        // Hide the circle and decrement the number
        else if (!addMode && this.classList.contains('numberable')) {
          this.classList.remove('numberable');
          nextNum--;
        }
      });
    }
  }
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
    }
  }
}