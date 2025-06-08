// breakout/index.js

import { Morph as Box, Ellipse, Text } from 'lively.morphic';
import { Color, pt, rect } from 'lively.graphics';

// ===========================================================================
// Game Configuration Constants
// ===========================================================================
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_HEIGHT = 20;
const PADDLE_WIDTH = 120;
const PADDLE_SPEED = 10; // Pixels per game loop step
const BALL_RADIUS = 10;
const BALL_INITIAL_SPEED = 7; // Pixels per game loop step
const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_HEIGHT = 25;
const BRICK_SPACING = 5; // Spacing between bricks
const BRICK_COLORS = [
  Color.rgb(255, 0, 0), // Red
  Color.rgb(255, 165, 0), // Orange
  Color.rgb(255, 255, 0), // Yellow
  Color.rgb(0, 128, 0), // Green
  Color.rgb(0, 0, 255) // Blue
];
const GAME_FPS = 90; // Frames per second for the game loop

// ===========================================================================
// 1. Brick Morph
//    A simple rectangular morph that can be destroyed.
// ===========================================================================
export class Brick extends Box {
  static get properties () {
    return {
      isDestroyed: { defaultValue: false } // Tracks if the brick has been hit
    };
  }

  constructor (props = {}) {
    super({
      fill: Color.gray, // Initial color, will be set by game logic
      borderColor: Color.black,
      borderWidth: 1,
      grabbable: false, // Bricks cannot be moved by hand
      droppable: false,
      ...props
    });
  }

  // Marks the brick as destroyed and removes it visually
  destroy () {
    this.isDestroyed = true;
    this.visible = false; // Make it invisible
    this.remove(); // Remove from its parent morph (the game board)
  }
}

// ===========================================================================
// 2. Paddle Morph
//    The player's controllable paddle.
// ===========================================================================
export class Paddle extends Box {
  static get properties () {
    return {
      speed: { defaultValue: PADDLE_SPEED } // Movement speed of the paddle
    };
  }

  constructor (props = {}) {
    super({
      position: pt(0, 0), // Default position for the Paddle morph itself
      extent: pt(PADDLE_WIDTH, PADDLE_HEIGHT), // Default size for the Paddle morph itself
      fill: Color.blue,
      borderColor: Color.white,
      borderWidth: 2,
      grabbable: false,
      droppable: false,
      ...props // Apply any custom properties
    });
  }

  // Moves the paddle to the left, respecting game boundaries
  moveLeft () {
    this.position = this.position.withX(Math.max(0, this.position.x - this.speed));
  }

  // Moves the paddle to the right, respecting game boundaries
  moveRight () {
    this.position = this.position.withX(Math.min(GAME_WIDTH - this.width, this.position.x + this.speed));
  }
}

// ===========================================================================
// 3. Ball Morph
//    The bouncing ball, handling its movement and basic reset.
// ===========================================================================
export class Ball extends Ellipse {
  static get properties () {
    return {
      dx: { defaultValue: 0 }, // X velocity component
      dy: { defaultValue: 0 }, // Y velocity component
      speed: { defaultValue: BALL_INITIAL_SPEED } // Overall speed magnitude
    };
  }

  constructor (props = {}) {
    super({
      position: pt(0, 0), // Default position if not provided by props
      extent: pt(BALL_RADIUS * 2, BALL_RADIUS * 2), // Default size if not provided by props
      fill: Color.white,
      grabbable: false,
      droppable: false,
      ...props // Apply any custom properties
    });
  }

  // Initiates ball movement, typically at the start of a round
  start () {
    this.dx = (Math.random() > 0.5 ? 1 : -1) * this.speed * 0.7; // Start with some horizontal motion, slightly less speed
    this.dy = this.speed * 0.7; // Now always start moving DOWN (positive Y), slightly less speed initially
  }

  // Resets the ball's position to above the paddle and stops its movement
  reset (paddleX, paddleY, paddleWidth) {
    // Calculate the Y position just below the lowest row of bricks
    // Bricks start at Y=50. Last row is (BRICK_ROWS - 1).
    const lastBrickRowY = 50 + (BRICK_ROWS - 1) * (BRICK_HEIGHT + BRICK_SPACING);
    const lastBrickBottomEdge = lastBrickRowY + BRICK_HEIGHT;

    this.position = pt(
      paddleX + paddleWidth / 2 - this.width / 2, // Centered horizontally above paddle
      lastBrickBottomEdge + 10 // 10 pixels below the last brick row
    );
    this.dx = 0;
    this.dy = 0;
  }

  // Updates the ball's position based on its current velocity
  step (dt) {
    this.position = pt(this.position.x + this.dx * dt, this.position.y + this.dy * dt);
  }
}

// ===========================================================================
// 4. BreakoutGame Morph (Main Game Board and Logic)
//    Manages all game elements, updates, and rules.
// ===========================================================================
export class BreakoutGame extends Box {
  static get properties () {
    return {
      gameWidth: { defaultValue: GAME_WIDTH },
      gameHeight: { defaultValue: GAME_HEIGHT },
      paddle: { serialize: false }, // Paddle morph instance
      ball: { serialize: false }, // Ball morph instance
      bricks: { serialize: false, defaultValue: [] }, // 2D array of Brick morphs
      score: { defaultValue: 0 },
      lives: { defaultValue: 3 },
      isGameRunning: { defaultValue: false },
      isGameOver: { defaultValue: false },
      gameLoopInterval: { serialize: false }, // Handle for the setInterval loop
      _errorTimeout: { serialize: false }, // Timeout handle for error display
      statusMessage: { serialize: false }, // Text morph for game status
      scoreDisplay: { serialize: false }, // Text morph for score
      livesDisplay: { serialize: false }, // Text morph for lives
      errorDisplay: { serialize: false } // New property for error display
    };
  }

  constructor (props = {}) {
    super({
      name: 'BreakoutGame',
      bounds: rect(0, 0, GAME_WIDTH, GAME_HEIGHT), // Fixed game screen size
      fill: Color.darkGray.darker(0.5), // Dark background
      borderColor: Color.white,
      borderWidth: 3,
      clipMode: 'hidden', // Crucial: clips submorphs that go outside these bounds
      ...props // Apply any custom properties
    });

    this.setupGameElements(); // Create paddle, ball, bricks
    this.addDisplays(); // Add UI for score, lives, status
    this.resetGame(); // Initialize game to starting state
    this.updateStatus('Press Left/Right arrows to move. Press SPACE to start!');

    this.setupGlobalErrorCatching(); // Set up global error handling
  }

  // Sets up the paddle, ball, and calls createBricks
  setupGameElements () {
    this.paddle = new Paddle({
      position: pt(this.width / 2 - PADDLE_WIDTH / 2, this.height - PADDLE_HEIGHT - 30)
    });
    this.addMorph(this.paddle);
    // The paddle is placed at the bottom of the screen, 30 pixels from the bottom edge.

    this.ball = new Ball();
    this.addMorph(this.ball);

    this.createBricks();
  }

  // Adds Text morphs for displaying score, lives, and game status
  addDisplays () {
    const textProps = {
      fontColor: Color.white,
      fontSize: 20,
      reactsToPointer: false, // Prevents text from capturing clicks
      grabbable: false
    };

    this.scoreDisplay = new Text({ ...textProps, name: 'scoreDisplay' });
    this.addMorph(this.scoreDisplay);

    this.livesDisplay = new Text({ ...textProps, name: 'livesDisplay' });
    this.addMorph(this.livesDisplay);

    this.statusMessage = new Text({
      ...textProps,
      name: 'statusMessage',
      fontSize: 24,
      fontWeight: 'bold',
      fontColor: Color.orange
    });
    this.addMorph(this.statusMessage);

    this.updateDisplays(); // Set initial text and positions
  }

  // Lays out the bricks in a grid pattern
  createBricks () {
    // Calculate brick width to fit perfectly with spacing
    const brickWidth = (this.gameWidth - BRICK_SPACING * (BRICK_COLS + 1)) / BRICK_COLS;
    const startY = 50; // Y offset from top for the first row of bricks

    for (let r = 0; r < BRICK_ROWS; r++) {
      this.bricks[r] = [];
      for (let c = 0; c < BRICK_COLS; c++) {
        const brick = new Brick({
          bounds: rect(
            BRICK_SPACING + c * (brickWidth + BRICK_SPACING), // X position
            startY + r * (BRICK_HEIGHT + BRICK_SPACING), // Y position
            brickWidth,
            BRICK_HEIGHT
          ),
          fill: BRICK_COLORS[r % BRICK_COLORS.length] // Assign color based on row index
        });
        this.addMorph(brick); // Add brick to the game board
        this.bricks[r][c] = brick; // Store reference in the game's brick grid
      }
    }
  }

  // Resets all game elements and state to start a new game
  resetGame () {
    this.score = 0;
    this.lives = 3;
    this.isGameRunning = false;
    this.isGameOver = false;
    this.keysPressed = { Left: false, Right: false, a: false, d: false, ' ': false, Space: false }; // Initialize with keys actually checked

    // Remove all old bricks and recreate them for a fresh board
    this.bricks.forEach(row => row.forEach(brick => {
      if (brick && !brick.isDestroyed && brick.owner === this) { // Ensure it's not already removed
        brick.remove();
      }
    }));
    this.bricks = [];
    this.createBricks();

    this.ball.reset(this.paddle.position.x, this.paddle.position.y, this.paddle.width); // Position ball above paddle
    this.updateDisplays(); // Update all UI elements
    this.updateStatus('Press SPACE to start!');
  }

  // Starts the main game animation loop
  startGame () {
    if (this.isGameRunning) return; // Prevent starting if already running
    this.isGameRunning = true;
    this.isGameOver = false;
    this.ball.start(); // Get the ball moving
    this.updateStatus(''); // Clear the status message
    // Start the game loop using setInterval for fixed FPS
    this.gameLoopInterval = setInterval(() => this.gameLoop(), 1000 / GAME_FPS);
  }

  // Stops the game animation loop
  stopGame () {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.isGameRunning = false;
  }

  // Main game loop function, called every frame (60 times per second)
  gameLoop () {
    if (this.isGameOver || !this.isGameRunning) return; // Stop if game not active

    this.ball.step(1); // Move ball one step (dt=1 for simplicity with fixed interval)
    this.handleInput(); // Process continuous paddle movement

    // Handle all collision types
    this.handleWallCollisions();
    this.handlePaddleCollision();
    this.handleBrickCollisions();

    this.updateDisplays(); // Update score and lives UI

    // Check game win/lose conditions after all updates
    this.checkWinCondition();
    this.checkLoseCondition();
  }

  // Handles ball collisions with the game board's walls
  handleWallCollisions () {
    // All calculations are relative to the BreakoutGame morph's top-left (0,0)

    // Left Wall
    if (this.ball.position.x <= 0) {
      this.ball.dx *= -1; // Reverse X direction
      this.ball.position = pt(1, this.ball.position.y); // Nudge off wall
    }
    // Right Wall
    else if (this.ball.position.x + this.ball.width >= this.gameWidth) {
      this.ball.dx *= -1;
      this.ball.position = pt(this.gameWidth - this.ball.width - 1, this.ball.position.y); // Nudge off wall
    }

    // Top Wall
    if (this.ball.position.y <= 0) {
      this.ball.dy *= -1; // Reverse Y direction
      // Nudge ball slightly to prevent sticking to the ceiling
      this.ball.position = pt(this.ball.position.x, 1); // Nudge off ceiling
    }

    // Bottom Wall (Ball falls out - Lose a life)
    if (this.ball.position.y + this.ball.height >= this.gameHeight) {
      this.loseLife();
    }
  }

  // Handles ball collision with the paddle
  handlePaddleCollision () {
    const ballX = this.ball.position.x;
    const ballY = this.ball.position.y;
    const ballWidth = this.ball.width;
    const ballHeight = this.ball.height;

    const paddleX = this.paddle.position.x;
    const paddleY = this.paddle.position.y;
    const paddleWidth = this.paddle.width;
    const paddleHeight = this.paddle.height;

    // Manual AABB collision check
    const intersects = ballX < paddleX + paddleWidth &&
                       ballX + ballWidth > paddleX &&
                       ballY < paddleY + paddleHeight &&
                       ballY + ballHeight > paddleY;

    // Check for intersection and ensure ball is moving downwards (to prevent multiple hits)
    // Check for intersection AND ensure ball is moving downwards AND that its bottom is at or past paddle's top
    // This helps prevent false positives or bouncing through
    if (intersects && this.ball.dy > 0 && (ballY + ballHeight) >= paddleY) {
      // Nudge the ball back to sit on the paddle's top edge to prevent tunneling
      this.ball.position = pt(ballX, paddleY - ballHeight); // Only nudge Y, keep X unchanged
      this.ball.dy *= -1; // Reverse Y direction

      // Calculate reflection based on where the ball hit the paddle relative to the paddle's center
      // Normalize hit position: -1 for far left, 0 for center, 1 for far right
      const paddleCenter = paddleX + paddleWidth / 2;
      const ballCenter = ballX + ballWidth / 2;
      const hitSpot = (ballCenter - paddleCenter) / (paddleWidth / 2); // Ranges from -1 to 1

      // Define a maximum deflection angle from the vertical (e.g., 75 degrees)
      // This ensures the ball always has a significant upward component
      const MAX_DEFLECTION_ANGLE = Math.PI / 2 * 0.8; // Roughly 72 degrees from vertical (18 deg from horizontal)

      let newAngle = (Math.PI / 2) + (hitSpot * MAX_DEFLECTION_ANGLE);
      this.ball.dx = this.ball.speed * Math.cos(newAngle); // Horizontal component
      this.ball.dy = -this.ball.speed * Math.sin(newAngle); // Vertical component (always upwards and never zero)
    }
  }

  // Handles ball collision with any active bricks
  handleBrickCollisions () {
    const ballX = this.ball.position.x;
    const ballY = this.ball.position.y;
    const ballWidth = this.ball.width;
    const ballHeight = this.ball.height;

    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const brick = this.bricks[r][c];

        const brickX = brick.position.x;
        const brickY = brick.position.y;
        const brickWidth = brick.width;
        const brickHeight = brick.height;

        // Manual AABB collision check for brick
        const intersects = ballX < brickX + brickWidth &&
                           ballX + ballWidth > brickX &&
                           ballY < brickY + brickHeight &&
                           ballY + ballHeight > brickY;

        if (!brick.isDestroyed && intersects) {
          this.score += 100;
          this.updateScore();
          brick.destroy();

          // Reflect ball based on which side of the brick was hit
          const xOverlap = Math.min(ballX + ballWidth, brickX + brickWidth) - Math.max(ballX, brickX);
          const yOverlap = Math.min(ballY + ballHeight, brickY + brickHeight) - Math.max(ballY, brickY);

          // --- FIX START: More robust nudging after collision ---
          if (yOverlap < xOverlap) { // Hit from top or bottom (Y overlap is smaller, so it's the axis of least resistance)
            this.ball.dy *= -1;
            if (ballY + ballHeight / 2 < brickY + brickHeight / 2) { // Ball hit from top
              this.ball.position = pt(ballX, brickY - ballHeight);
            } else { // Ball hit from bottom
              this.ball.position = pt(ballX, brickY + brickHeight);
            }
          } else { // Hit from side (left or right) (X overlap is smaller or equal)
            this.ball.dx *= -1;
            if (ballX + ballWidth / 2 < brickX + brickWidth / 2) { // Ball hit from left
              this.ball.position = pt(brickX - ballWidth, ballY);
            } else { // Ball hit from right
              this.ball.position = pt(brickX + brickWidth, ballY);
            }
          }
          // --- FIX END ---
          // Only destroy one brick per frame
          return;
        }
      }
    }
  }

  // Decrements a life, stops game, and resets ball if lives remain
  loseLife () {
    this.lives--;
    this.stopGame(); // Pause game after losing a life
    if (this.lives <= 0) {
      this.isGameOver = true;
      this.updateStatus('GAME OVER! Press SPACE to restart.', Color.red);
    } else {
      this.updateStatus(`Life lost! ${this.lives} lives left. Press SPACE to continue.`, Color.orange); // This will clear previous status.
      this.ball.reset(this.paddle.position.x, this.paddle.position.y, this.paddle.width); // Reset ball above paddle
    }
    this.updateDisplays();
  }

  // Checks if all bricks are destroyed (win condition)
  checkWinCondition () {
    let allBricksDestroyed = true;
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        if (!this.bricks[r][c].isDestroyed) {
          allBricksDestroyed = false; // Found an active brick
          break;
        }
      }
      if (!allBricksDestroyed) break; // Exit outer loop if not all destroyed
    }

    if (allBricksDestroyed) {
      this.isGameOver = true;
      this.stopGame(); // Stop the game loop
      this.updateStatus('YOU WIN! Press SPACE to play again.', Color.green);
    }
  }

  // Checks for game over due to zero lives
  checkLoseCondition () {
    if (this.lives <= 0 && !this.isGameOver) { // Only trigger if not already game over
      this.isGameOver = true;
      this.stopGame();
      this.updateStatus('GAME OVER! Press SPACE to restart.', Color.red);
    }
  }

  // Updates the text and position of score, lives, and status displays
  updateDisplays () {
    this.scoreDisplay.textString = `Score: ${this.score}`;
    this.livesDisplay.textString = `Lives: ${this.lives}`;

    // Position score (top-left) and lives (top-right)
    this.scoreDisplay.position = pt(10, 10); // Using hardcoded 10 for padding, as `this.padding` was not defined.
    this.livesDisplay.position = pt(this.width - this.livesDisplay.textBounds().width - 10, 10); // Using hardcoded 10 for padding

    // Center the status message in the middle of the game screen
    this.statusMessage.position = pt(
      this.width / 2 - this.statusMessage.textBounds().width / 2,
      this.height / 2 - this.statusMessage.textBounds().height / 2
    );
  }

  // Updates the text and color of the main status message
  updateStatus (message, color = Color.white) {
    this.statusMessage.textString = message;
    this.statusMessage.fontColor = color;
    this.updateDisplays(); // Recenter the status message if text width changed
  }

  // Updates the score display text
  updateScore () {
    this.scoreDisplay.textString = `Score: ${this.score}`;
  }

  // ===========================================================================
  // Global Error Catching
  // ===========================================================================
  setupGlobalErrorCatching () {
    this.errorDisplay = new Text({
      name: 'errorDisplay',
      textString: '',
      fontColor: Color.red,
      fontSize: 16,
      fontWeight: 'bold',
      fill: Color.rgba(0, 0, 0, 0.7), // Semi-transparent black background
      borderColor: Color.red,
      borderWidth: 2,
      padding: rect(5, 5, 5, 5),
      visible: false, // Hidden by default
      grabbable: false,
      reactsToPointer: false, // So it doesn't block game interaction
      position: pt(10, this.height - 100), // Position at bottom left, above paddle
      extent: pt(this.width - 20, 90), // Fixed width, adaptable height
      clipMode: 'hidden' // To truncate long messages
    });
    this.addMorph(this.errorDisplay);

    // Catch uncaught errors
    window.onerror = (message, source, lineno, colno, error) => {
      let errorMessage = `Error: ${message}`;
      let errorDetails = error ? error.stack : `at ${source}:${lineno}:${colno}`;
      this.showError(errorMessage, errorDetails);
      return true; // Prevent default browser error handling
    };

    // Catch uncaught promise rejections
    window.onunhandledrejection = (event) => {
      let errorMessage = `Unhandled Promise Rejection: ${event.reason}`;
      let errorDetails = event.reason && event.reason.stack ? event.reason.stack : 'No stack trace available';
      this.showError(errorMessage, errorDetails);
      event.preventDefault(); // Prevent default browser handling (e.g., console warning)
    };
  }

  showError (message, details = '') {
    console.error('Application Error Caught:', message, details); // Still log to console for development
    this.errorDisplay.textString = `${message}\n${details.split('\n')[0]}`; // Show message + first line of stack
    this.errorDisplay.visible = true;

    // Reposition to ensure it's visible if text changed size significantly
    // We use a fixed width, but if the actual text width is smaller, it might look off.
    // For simplicity, just center it horizontally based on its new text content.
    this.errorDisplay.position = pt(
      this.width / 2 - this.errorDisplay.textBounds().width / 2,
      this.height - this.errorDisplay.textBounds().height - 10
    );

    // Hide the error after a few seconds
    if (this._errorTimeout) clearTimeout(this._errorTimeout);
    this._errorTimeout = setTimeout(() => {
      this.errorDisplay.visible = false;
      this.errorDisplay.textString = '';
    }, 7000); // Hide after 7 seconds
  }

  // Handles keyboard input for paddle movement and game start/restart
  onKeyDown (evt) {
    // Initialize keysPressed if it doesn't exist
    if (!this.keysPressed) {
      this.keysPressed = {};
    }
    this.keysPressed[evt.key] = true; // Mark the key as pressed

    // The Space key directly controls game state (start/restart)
    if (evt.key === ' ' || evt.key === 'Space') { // Check for both 'Space' and ' ' for common browser key event property
      if (!this.isGameRunning && !this.isGameOver) { // If game is paused and not over, start it
        this.startGame();
      } else if (this.isGameOver) { // If game is over, restart it
        this.resetGame();
        this.startGame();
      }
    }
  }

  onKeyUp (evt) {
    // Initialize keysPressed if it doesn't exist
    if (!this.keysPressed) {
      this.keysPressed = {};
    }
    this.keysPressed[evt.key] = false; // Mark the key as released
  }

  // New method to handle continuous input based on keysPressed state
  handleInput () {
    if (!this.isGameRunning) return; // Only process input if game is running

    if (this.keysPressed['Left'] || this.keysPressed['a']) { // Changed 'left' to 'Left'
      this.paddle.moveLeft();
    }
    if (this.keysPressed['Right'] || this.keysPressed['d']) { // Changed 'right' to 'Right'
      this.paddle.moveRight();
    }
  }
}
