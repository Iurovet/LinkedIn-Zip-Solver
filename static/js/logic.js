// Run at the start
document.addEventListener('DOMContentLoaded', () => {
    setDimensions(6);
});

// Sets table size to a square of side length 5, 6, 7 or 8
function setDimensions(size) {
  // Find the table and rows
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