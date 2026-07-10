async function sendData(payload) {
  // Clear the previous lines
  document.getElementById('line-canvas').innerHTML = '';

  try {
    const response = await fetch('/api/generate-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
        console.log(parsedNode);

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

// Declare the variables here at the start so that any function can see them.
let currNode, delay, lastSize, nextNum, pathType, parameters, container, table, rows, svg;

// Keep track of the current state and next number
const EditMode = Object.freeze({
  ADD: 'ADD',
  REMOVE: 'REMOVE',
  OFF: 'OFF'
});

document.addEventListener('DOMContentLoaded', () => {
    currMode = EditMode.ADD;
    delay = 2 // Default delay
    lastSize = "0x0" // Track the previous size, at this stage unavailable
    nextNum = 1;
    parameters = document.querySelectorAll('input:not(.cellEditMode input)'); // Except edit mode
    pathType = true // Forward direction

    // Locations on the page
    container = document.querySelector('.table-container');
    table = document.querySelector('table').tBodies[0];
    rows = table.rows;
    svg = document.getElementById('line-canvas');
  
    initialiseButton(); // Set up button behaviour
    initialiseCells(); // Clean up the cells and set their behaviour
    setDimensions(6); // Default dimensions 6x6 (removes the excess)
    
    // Change the delay, independent of browser behaviour
    document.getElementById('delay').addEventListener('input', (event) => {
      delay = event.target.value;
      document.getElementById('delay-display').textContent = delay + "s";
      event.preventDefault();
    });
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

function initialiseButton() {
  document.getElementById("start").addEventListener("click", async () => {
    // Disable solving and all other controls
    parameters.forEach(control => {
      control.disabled = true;
    });
    document.getElementById("start").disabled = true;
    document.getElementById("start").textContent = "Solving";
    
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
          checkpoint: element.textContent.trim() !== "" ? parseInt(element.textContent, 10) : null
        });
      }
      
      filledCells.push(rowData);
    }

    // Send the data (clear the lines first)
    await sendData({
      "filledCells": filledCells,
      "pathType": pathType,
      "delay": parseFloat(delay, 10)});

    // Re-enable solving and all other controls
    const div = document.querySelector('.cellEditMode');
    parameters.forEach(control => {
      control.disabled = false;
    });
    document.getElementById("start").disabled = false;
    document.getElementById("start").textContent = "Start solving";
  });
}

function initialiseCells() {
  for (let i = 0; i < rows.length; i++) {
    const columns = rows[i].cells;
    for (let j = 0; j < columns.length; j++) {
      const cell = columns[j];

      // Remove everything then add click functionality
      cell.innerHTML = "";
      cell.addEventListener('click', function() {
        /* Make sure editing the grid does nothing whilst attempting to solve, where
         * the main sign of such is the disabled controls (and only then is the
         * solve button rendered inoperative, so as not to permanently lock someone
         * out of pressing it).
        */
        if (document.querySelector('input[type="radio"]:disabled') !== null) {
          return;
        }

        // Find a circle in this cell
        let circle = cell.querySelector('.circle');

        // Show the circle (if not already there) and increment the next number
        if (currMode == EditMode.ADD && !circle) {
          circle = document.createElement('div');
          circle.classList.add('circle');
          circle.textContent = String(nextNum);
          
          // Show the circle in the table cell
          cell.appendChild(circle);
          
          // Clear the previous lines and increment.
          document.getElementById('line-canvas').innerHTML = '';
          nextNum++;
        }

        // Hide the circle and decrement the number
        else if (currMode == EditMode.REMOVE && circle) {
          let currNumber = parseInt(circle.textContent, 10);
          cell.innerHTML = "";
          updateNumbers(currNumber); // All higher elements get reduced by one
          
          // Clear the previous lines
          document.getElementById('line-canvas').innerHTML = '';
          nextNum--;
        }

        // Cannot solve unless there are 2 different cells
        document.getElementById("start").disabled = nextNum <= 2;
      });
    }
  }
}

function setDimensions(size) {
  /* Clear the previous lines if not already done so (requires updating the size).
   * Use id as the default size of 6x6 is shown as such on the frontend.
  */
  if (document.getElementById(size + "x" + size).id !== lastSize) {
    document.getElementById('line-canvas').innerHTML = '';
    lastSize = document.getElementById(size + "x" + size).id
  }
  
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
          cells[j].innerHTML = "";
          updateNumbers(currNumber);
          nextNum--;
        }
      }
    }
  }

  // If less than 2 circles are left, disable solving
  document.getElementById("start").disabled = nextNum <= 2;
}

// Change the edit mode
function setEditMode(value){
  currMode = Object.keys(EditMode).find(key => EditMode[key] === value);
  
  // Enable/disable all other controls
  parameters.forEach(control => {
    control.disabled = currMode == EditMode.OFF
  });
}

/* Set the path direction to forward (true) or reverse (false).
 * The latter produces quirky, but ultimately correct results.
*/
function setPathType(isNormal) { pathType = isNormal; }

function updateNumbers(currNum) {
  /* Get the visible cells. Note that {numeric: true} favours outcomes
   * of the type [1, 2, 10], rather than [1, 10, 2]
  */
  const filledCircles = [...rows]
    .flatMap(row => [...row.cells])
    .filter(cell => cell.offsetParent !== null && cell.querySelector('.circle') !== null)
    .map(cell => cell.querySelector('.circle'))
    .sort((a, b) => a.textContent.localeCompare(b.textContent, undefined, { numeric: true }));

  // Downshift the numbers greater than currNum
  filledCircles.forEach(circle => {
    const circleValue = parseInt(circle.textContent, 10);
    if (circleValue > currNum) {
      circle.textContent = (circleValue - 1).toString();
    }
  });
}

// Hotkeys
window.addEventListener('keydown', (event) => {
    // Resizing (the comparison fails with letters)
    const number = parseInt(event.key, 10);
    if (number === number && number >= 5 && number <= 8) {
      document.getElementById(number + "x" + number).click();
    }

    // Mode changes
    else {
      // Upper or lowercase is arbitrary, just be consistent
      const key = event.key.toLowerCase();
      switch (key) {
        case "a":
          document.getElementById("add").click();
          break;
        case "b":
          document.getElementById("remove").click();
          break;
        case "c":
          document.getElementById("off").click();
          break;
        case "d":
          document.getElementById("normal").click();
          break;
        case "e":
          document.getElementById("surprise").click();
          break;
        default:
          break;
      }
    }

    // Prevent browser behaviour
    event.preventDefault();
});