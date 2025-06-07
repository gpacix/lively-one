// index.js (within your 'my-lights-out-game' package)

import { Morph as Box, Ellipse, Text } from 'lively.morphic';
import { Color, pt, rect } from 'lively.graphics';

const LIGHT_ON_COLOR = Color.rgb(192, 224, 255, 255); // A light blue for 'on' state

// ===========================================================================
// 1. Light Morph: Represents a single clickable light on the board
// (Re-used and slightly adapted from previous iterations)
// ===========================================================================
export class Light extends Ellipse {
  static get properties () {
    return {
      isLit: {
        defaultValue: false, // Default state: off
        set (value) {
          this.setProperty('isLit', value); // Internal Lively property setter
          this.updateVisuals(); // Update the morph's appearance
        }
      },
      // Store the light's position within the game board grid
      row: { defaultValue: -1 },
      col: { defaultValue: -1 }
    };
  }

  constructor (props = {}) {
    super({
      position: pt(0, 0), // Default position if not provided by props
      extent: pt(60, 60), // Default size if not provided by props
      name: 'Light',
      borderWidth: 1,
      borderColor: Color.black,
      grabbable: false, // Individual lights cannot be dragged
      droppable: false,
      handStyle: 'pointer', // Cursor indicates it's clickable
      fill: Color.darkGray, // Initial visual state
      ...props // Apply any custom properties passed in
    });
    this.updateVisuals(); // Set initial color based on `isLit` default
  }

  // Updates the fill color based on the `isLit` state
  updateVisuals () {
    this.fill = (this.isLit ? LIGHT_ON_COLOR : Color.darkGray);
  }

  // Event handler for mouse click/touch release on the light
  onMouseUp (evt) {
    // Notify the parent (LightsOutGame) that this light was clicked, passing its grid coordinates
    if (this.owner && typeof this.owner.lightClicked === 'function') {
      this.owner.lightClicked(this.row, this.col);
    }
    evt.stop(); // Prevent event from bubbling up to parent morphs or the world
  }
}

// ===========================================================================
// 2. LightsOutGame Morph: The main game board and logic
// ===========================================================================
export class LightsOutGame extends Box {
  static get properties () {
    return {
      boardSize: {
        defaultValue: 5, // Fixed 5x5 game board
        readOnly: true
      },
      lightSize: { defaultValue: 60 }, // Size of individual light morphs
      spacing: { defaultValue: 5 }, // Space between lights
      padding: { defaultValue: 20 }, // Padding around the grid
      lights: {
        // 2D array to hold Light morph instances
        serialize: false, // Prevent serialization of the morphs themselves
        defaultValue: []
      },
      isSolved: {
        defaultValue: false,
        set (value) {
          this.setProperty('isSolved', value);
          if (value) {
            this.showWinMessage(); // Display "WIN!" message on solve
          } else {
            this.hideWinMessage(); // Hide it otherwise
          }
        }
      },
      winMessage: {
        serialize: false // The Text morph for the win message, created dynamically
      },
      statusMessage: { // New property for the status message morph
        serialize: false
      }
    };
  }

  constructor (props = {}) {
    super({
      name: 'LightsOutGame',
      fill: Color.darkGray.darker(0.3), // Darker background for the game
      borderColor: Color.gray,
      borderWidth: 2,
      grabbable: true, // Allows the entire game board to be moved
      ...props
    });

    this.createBoard(); // Initialize the grid of lights
    this.addControls(); // Add "New Game" button and win message
    this.addStatusMessage(); // Add the new status message morph
    this.newGame(); // Start the first game
  }

  // Initializes the 5x5 grid of Light morphs
  createBoard () {
    this.lights = [];
    // Calculate required dimensions for the panel based on light size, spacing, and padding
    const gridDim = (this.lightSize + this.spacing) * this.boardSize - this.spacing;
    const panelWidth = gridDim + (this.padding * 2);
    // Add extra height for the button and message
    const panelHeight = gridDim + (this.padding * 2) + 60;

    this.extent = pt(panelWidth, panelHeight); // Set the panel's size

    for (let r = 0; r < this.boardSize; r++) {
      this.lights[r] = [];
      for (let c = 0; c < this.boardSize; c++) {
        const light = new Light({
          row: r, // Store grid row
          col: c, // Store grid column
          position: pt(
            this.padding + c * (this.lightSize + this.spacing),
            this.padding + r * (this.lightSize + this.spacing)
          ),
          extent: pt(this.lightSize, this.lightSize)
        });
        this.addMorph(light); // Add light to the panel
        this.lights[r][c] = light; // Store reference in the grid array
      }
    }
  }

  // Adds UI controls like the "New Game" button and win message
  addControls () {
    const buttonHeight = 30;
    const buttonWidth = 120;
    const buttonY = this.height - this.padding - buttonHeight; // Position at the bottom of the panel

    // New Game Button
    const newGameButton = new Box({
      name: 'newGameButton',
      fill: Color.darkBlue,
      extent: pt(buttonWidth, buttonHeight),
      position: pt(this.width / 2 - buttonWidth / 2, buttonY), // Center horizontally
      borderColor: Color.black,
      borderWidth: 1,
      grabbable: false,
      handStyle: 'pointer',
      submorphs: [ // Add text as a submorph to the button
        new Text({
          textString: 'New Game',
          fontColor: Color.white,
          fontSize: 16,
          reactsToPointer: false, // Important: Let the parent button handle clicks
          // Center the text within the button
          position: pt(
            (buttonWidth - new Text({ textString: 'New Game', fontSize: 16 }).textBounds().width) / 2,
            (buttonHeight - new Text({ textString: 'New Game', fontSize: 16 }).textBounds().height) / 2
          )
        })
      ]
    });
    newGameButton.onMouseUp = () => this.newGame(); // Attach click handler
    this.addMorph(newGameButton);

    // Win Message (Text Morph)
    this.winMessage = new Text({
      name: 'winMessage',
      textString: 'WIN!',
      fontColor: Color.green.darker(),
      fontSize: 40,
      fontWeight: 'bold',
      visible: false, // Start hidden
      grabbable: false,
      reactsToPointer: false
    });
    // Position the win message centrally above the grid
    this.winMessage.position = pt(
      this.width / 2 - this.winMessage.textBounds().width / 2,
      this.padding / 2 // Just below the top padding
    );
    this.addMorph(this.winMessage);
    this.hideWinMessage(); // Ensure it's hidden initially
  }

  // New method: Creates and adds the status message morph
  addStatusMessage () {
    this.statusMessage = new Text({
      name: 'gameStatusMessage',
      textString: '',
      fontColor: Color.white,
      fontSize: 14,
      reactsToPointer: false
    });
    // Add it to the morph first so its textBounds() can be calculated for positioning
    this.addMorph(this.statusMessage);

    // Position it at the bottom of the panel, just above the "New Game" button area
    const buttonY = this.height - this.padding - 30; // 30 is buttonHeight from addControls
    this.statusMessage.position = pt(
      this.padding, // Start from left padding, horizontal centering handled by updateStatus
      buttonY - this.statusMessage.textBounds().height - 5 // 5 pixels above button
    );
  }

  // =========================================================================
  // Game Logic Methods
  // =========================================================================

  // Called by a Light morph when it's clicked
  lightClicked (row, col) {
    if (this.isSolved) {
      // Prevent further clicks if the game is already won
      this.updateStatus("Game already won! Click 'New Game' to play again.", Color.orange);
      return;
    }
    // Apply the toggle effect to the clicked light and its neighbors
    this._applyToggleEffect(row, col);
    this.checkWinCondition(); // Check if the game has been won
  }

  // Applies the Lights Out toggle rule: toggles a central light and its immediate neighbors
  _applyToggleEffect (row, col) {
    this._toggleSingleLight(row, col); // The clicked light itself
    this._toggleSingleLight(row - 1, col); // Above
    this._toggleSingleLight(row + 1, col); // Below
    this._toggleSingleLight(row, col - 1); // Left
    this._toggleSingleLight(row, col + 1); // Right
  }

  // Toggles the `isLit` state of a single light at given coordinates, with boundary checks
  _toggleSingleLight (row, col) {
    if (row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize) {
      const light = this.lights[row][col];
      light.isLit = !light.isLit; // Toggle the state directly
    }
  }

  // Starts a new game: resets board, generates puzzle, hides win message
  newGame () {
    this.resetLights(); // Turn all lights off first
    this.isSolved = false; // Reset the win condition flag
    this.hideWinMessage(); // Ensure win message is not visible
    this.generatePuzzle(); // Create a new random solvable puzzle
    this.updateStatus('New Lights Out game started!', Color.blue);
  }

  // Turns all lights on the board off
  resetLights () {
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        this.lights[r][c].isLit = false;
      }
    }
  }

  // Generates a solvable Lights Out puzzle by performing random internal toggles
  // (a common method to ensure a solvable puzzle)
  generatePuzzle () {
    this.resetLights(); // Ensure starting from a solved state

    const numRandomToggles = 10 + Math.floor(Math.random() * 10); // Perform 10-19 random "clicks"
    for (let i = 0; i < numRandomToggles; i++) {
      const r = Math.floor(Math.random() * this.boardSize);
      const c = Math.floor(Math.random() * this.boardSize);
      // Use the internal _applyToggleEffect to avoid triggering public lightClicked
      // and win checks during puzzle generation
      this._applyToggleEffect(r, c);
    }
    // Ensure isSolved is explicitly false after puzzle generation
    this.isSolved = false;
  }

  // Checks if all lights are off, indicating a win
  checkWinCondition () {
    let allOff = true;
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (this.lights[r][c].isLit) {
          allOff = false; // Found an 'on' light, so not solved
          break;
        }
      }
      if (!allOff) break; // Exit outer loop if already not solved
    }

    if (allOff) {
      this.isSolved = true; // Set property, which triggers showWinMessage
      this.updateStatus('Congratulations! You won Lights Out!', Color.green);
    }
  }

  // New method: Updates the text and color of the status message morph
  updateStatus (message, color = Color.white) {
    this.statusMessage.textString = message;
    this.statusMessage.fontColor = color;
    // Recenter horizontally in case text width changes
    this.statusMessage.position = pt(this.width / 2 - this.statusMessage.textBounds().width / 2, this.statusMessage.position.y);
  }

  // Displays the "WIN!" message
  showWinMessage () {
    this.winMessage.visible = true;
  }

  // Hides the "WIN!" message
  hideWinMessage () {
    this.winMessage.visible = false;
  }
}
