// MyLights.js

// Import necessary modules from lively.next
import { Box, Ellipse, Color, World } from 'lively.graphics';
import { pt, rect } from 'lively.graphics/geometry-2d.js'; // For point and rectangle helpers

// ===========================================================================
// 1. Light Morph: Represents a single clickable light
// ===========================================================================
export class Light extends Ellipse {
  // Static properties define how this morph's properties behave (e.g., serialization, inspection)
  static get properties() {
    return {
      isLit: {
        defaultValue: false, // Default state: off
        set(value) {
          // Custom setter to update visuals immediately when 'isLit' changes
          this.setProperty('isLit', value); // Actually sets the property
          this.updateVisuals();             // Calls the method to change color
        }
      },
      // You can add more properties here if needed, e.g., 'lightColor'
    };
  }

  // Constructor: Initializes the light morph
  constructor(bounds = rect(0, 0, 50, 50)) {
    super(bounds); // Call the parent Ellipse constructor with bounds

    this.name = 'Light';
    this.setBorderWidth(1);
    this.setBorderColor(Color.black);
    this.setGrabbable(false); // Don't want individual lights to be grabbable
    this.setDroppable(false);
    this.setHandStyle('pointer'); // Changes cursor to indicate it's clickable

    this.updateVisuals(); // Set the initial color based on 'isLit' (which is false by default)
  }

  // Method to update the visual appearance based on 'isLit' state
  updateVisuals() {
    this.setFill(this.isLit ? Color.yellow : Color.darkGray);
  }

  // Event handler for mouse click (or touch release)
  onMouseUp(evt) {
    this.isLit = !this.isLit; // Toggle the 'isLit' property
    evt.stop(); // Stop event propagation to prevent it from affecting parent morphs
  }
}

// ===========================================================================
// 2. LightPanel Morph: A container for the four lights
// ===========================================================================
export class LightPanel extends Box {
  static get properties() {
    return {
      name: { defaultValue: 'LightPanel' },
      padding: { defaultValue: 20 } // Padding around the lights
    };
  }

  // Constructor: Creates and arranges the light morphs
  constructor(bounds = rect(0, 0, 260, 100)) {
    super(bounds); // Call the parent Box constructor

    this.setFill(Color.lightgray);
    this.setBorderWidth(2);
    this.setBorderColor(Color.gray);
    this.setGrabbable(true); // Allow the entire panel to be moved

    this.setupLights(); // Call a helper method to create and add lights
  }

  setupLights() {
    const lightSize = 50;
    const spacing = 10;
    let currentX = this.padding; // Start X position for the first light

    for (let i = 0; i < 4; i++) {
      // Create a new Light instance
      const light = new Light(rect(currentX, this.padding, lightSize, lightSize));
      this.addMorph(light); // Add the light as a submorph to the panel
      currentX += lightSize + spacing; // Move X for the next light
    }

    // Adjust the panel's size to fit the lights snugly
    const contentWidth = (lightSize * 4) + (spacing * 3) + (this.padding * 2);
    const contentHeight = lightSize + (this.padding * 2);
    this.setExtent(pt(contentWidth, contentHeight));
  }

  // Optional: A convenient method to open this panel in the current world
  openInWorld(world = World.current(), position = pt(100, 100)) {
    this.setPosition(position);
    world.addMorph(this);
    // You might want to remove it from the World first if it's already there:
    // if (this.world()) this.remove();
  }
}