async function sendData(filledCells) {
  // Clear the previous lines
  document.getElementById('line-canvas').innerHTML = '';

  try {
    const response = await fetch('/api/generate-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filledCells)
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    
    // Make sure multiple packets don't break the buffer
    let pathHistory = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete fragments in the buffer
      
      for (const line of lines) {
        // Skip unexpected trailing blank spaces then log
        if (!line.trim()) continue;
        const parsedNode = JSON.parse(line);
        console.log('New message:', parsedNode);

        // Guard against Python identifying structural graph compilation limits
        if (parsedNode.x === -1 || parsedNode.y === -1) {
          break;
        }

        // Push new node to the master path history
        pathHistory.push(parsedNode);

        // Draw line if we have at least two historic entries to bridge
        if (pathHistory.length > 1) {
          const prev = pathHistory[pathHistory.length - 2];
          const curr = pathHistory[pathHistory.length - 1];
          
          // Draw if the line (or its opposite) doesn't exist, erase if it does
          let key = `${prev.x},${prev.y}-${curr.x},${curr.y}`;
          let keyReverse = `${curr.x},${curr.y}-${prev.x},${prev.y}`;
          let lineSearch = svg.querySelector(
            `line[data-key="${key}"], line[data-key="${keyReverse}"]`
          );
          
          if (lineSearch) {
            lineSearch.remove();
          } else {
            drawLine(prev, curr);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/* Run at the start (start by finding the table, cells and graph area).
 * Declare the variables here so that any function can see them.
*/
let container, table, rows, svg;
document.addEventListener('DOMContentLoaded', () => {
    container = document.querySelector('.table-container');
    table = document.querySelector('table').tBodies[0];
    rows = table.rows;    
    svg = document.getElementById('line-canvas');
  
    initialiseButton(); // Set up button behaviour
    initialiseCells(); // Remove all cells and set their behaviour
    setDimensions(6); // Default dimensions 6x6
});

function drawLine(prev, curr) {
  // Find where to draw the cells
  const cellA = table.rows[prev.x].cells[prev.y];
  const cellB = table.rows[curr.x].cells[curr.y];
  
  // Get positions relative to the viewport
  const rectContainer = container.getBoundingClientRect();
  const rectA = cellA.getBoundingClientRect();
  const rectB = cellB.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${rectContainer.width} ${rectContainer.height}`);

  // Calculate centerpoints relative to the container
  const x1 = rectA.left - rectContainer.left + (rectA.width / 2);
  const y1 = rectA.top - rectContainer.top + (rectA.height / 2);
  const x2 = rectB.left - rectContainer.left + (rectB.width / 2);
  const y2 = rectB.top - rectContainer.top + (rectB.height / 2);
  
  // Create and append the SVG line (data-key allows for later erasure)
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("stroke", "red");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("data-key", `${prev.x},${prev.y}-${curr.x},${curr.y}`);
  svg.appendChild(line);
}

let editMode = true;
let nextNum = 1;
function initialiseButton() {
  document.getElementById("start").addEventListener("click", async () => {
    // Find the radio buttons so that they can all be disabled during solving
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
      radio.disabled = true;
    });

    // Also prevent "duplcate solving"
    document.getElementById("start").disabled = true;
    
    // Get the visible HTML rows
    const visibleRows = [...rows].filter(row => row.style.display === "");
    let filledCells = [];
    for (let i = 0; i < visibleRows.length; ++i) {
      let rowData = [];
      
      // Get the visible columns from this row
      const visibleCells = [...visibleRows[i].cells].filter(cell => cell.style.display === "");
      for (let j = 0; j < visibleCells.length; ++j) {
        let element = visibleCells[j];
        rowData.push({
          checkpoint: element.textContent.trim() !== "" ? parseInt(element.textContent) : null
        });
      }
      
      filledCells.push(rowData);
    }

    // Send the data (clear the lines first)
    await sendData(filledCells);

    // Re-enable options and solving
    radioButtons.forEach(radio => {
      radio.disabled = false;
    });

    document.getElementById("start").disabled = false;
  });
}

function initialiseCells() {
  for (let i = 0; i < rows.length; i++) {
    const columns = rows[i].cells;
    for (let j = 0; j < columns.length; j++) {
      const cell = columns[j];

      // Remove the text then add click functionality
      cell.innerHTML = "";
      cell.addEventListener('click', function() {
        /* Make sure editing the grid does nothing whilst attempting to solve, where
         * the main sign of such is the disabled radio buttons (and only then is the
         * solve button rendered inoperative, so as not to permanently lock someone
         * out of pressing it).
        */
        if (document.querySelector('input[type="radio"]:disabled') !== null) {
          return;
        }

        // Find a circle in this cell
        let circle = this.querySelector('.circle');

        // Show the circle (if not already there) and increment the next number
        if (editMode && !circle) {
          circle = document.createElement('div');
          circle.classList.add('circle');
          circle.textContent = String(nextNum);
          
          this.appendChild(circle); // Show the circle in the table cell
          nextNum++;
        }

        // Hide the circle and decrement the number
        else if (!editMode && circle) {
          let currNumber = parseInt(circle.textContent);
          circle.remove(); // Safely wipes the inner circle element entirely from the DOM
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

function setDimensions(size) {
  for (let i = 0; i < rows.length; i++) {
    // Check if the row should be hidden
    rows[i].style.display = i >= size ? "none" : "";
    
    const cells = rows[i].cells;
    for (let j = 0; j < cells.length; j++) {
      // Explicitly hide cells from hidden rows, not just columns
      cells[j].style.display = (i >= size || j >= size) ? "none" : "";
      
      // If so, remove the circle and number
      if (cells[j].style.display == "none") {
        let circle = cells[j].querySelector('.circle');
        if (circle) {
          let currNumber = parseInt(circle.textContent, 10);
          circle.remove();
          updateNumbers(currNumber);
          nextNum--;
        }
      }
    }
  }

  // If less than 2 circles are left, disable solving
  document.getElementById("start").disabled = nextNum <= 2;
}

function updateNumbers(currNum) {
  /* Get the visible cells. Note that {numeric: true} favours outcomes
   * of the type [1, 2, 10], rather than [1, 10, 2]
  */
  const filledCircles = [...rows]
    .flatMap(row => [...row.cells])
    .filter(cell => cell.offsetParent !== null && cell.querySelector('.circle') !== null)
    .map(cell => cell.querySelector('.circle'))
    .sort((a, b) => a.textContent.localeCompare(b.textContent, undefined, { numeric: true }));

  // Downshift the numbers greater than currNumb
  filledCircles.forEach(circle => {
    const circleValue = parseInt(circle.textContent, 10);
    if (circleValue > currNum) {
      circle.textContent = (circleValue - 1).toString();
    }
  });
}

window.addEventListener('keydown', (event) => {
    // Resizing (the comparison fails with letters)
    const number = parseInt(event.key, 10);
    if (number === number && number >= 5 && number <= 8) {
      document.getElementById(number + "x" + number).click();
    }

    // Get the key, irrespective of case (edit mode)
    else {
      const key = event.key.toLowerCase();
      switch (key) {
        case "a":
          document.getElementById("add").click();
          break;
        case "b":
          document.getElementById("remove").click();
          break;
        default:
          break;
      }
    }

    // Prevent browser behaviour
    event.preventDefault();
});