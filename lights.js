'format esm';
// lights.js

// Import necessary modules from lively.next
import { Morph as Box, Ellipse } from 'lively.morphic'; // , World
import { Color, pt, rect } from 'lively.graphics';
// import { pt, rect } from 'lively.graphics/geometry-2d.js'; // For point and rectangle helpers

const lightOnColor = Color.rgb(19, 224, 25, 255);

// ===========================================================================
// 1. Light Morph: Represents a single clickable light
// ===========================================================================
export class Light extends Ellipse {
  // Static properties define how this morph's properties behave (e.g., serialization, inspection)
  static get properties () {
    return {
      isLit: {
        defaultValue: false, // Default state: off
        set (value) {
          // Custom setter to update visuals immediately when 'isLit' changes
          this.setProperty('isLit', value); // Actually sets the property
          this.updateVisuals(); // Calls the method to change color
        }
      }
      // You can add more properties here if needed, e.g., 'lightColor'
    };
  }

  // Constructor: Initializes the light morph
  constructor (props = { bounds: rect(0, 0, 50, 50) }) {
    props.borderColor = Color.green;
    props.borderWidth = 2;
    // let props = {
    //   bounds: rect(0, 0, 50, 50),
    //   name: 'Light',
    //   borderWidth: 1,
    //   borderColor: Color.green
    // };
    super(props); // Call the parent Ellipse constructor with bounds

    this.name = 'Light';
    this.borderWidth = 1;
    this.borderColor = Color.black;
    this.grabbable = false; // Don't want individual lights to be grabbable
    this.droppable = false;
    this.handStyle = 'pointer'; // Changes cursor to indicate it's clickable

    this.updateVisuals(); // Set the initial color based on 'isLit' (which is false by default)
  }

  // Method to update the visual appearance based on 'isLit' state
  updateVisuals () {
    this.fill = (this.isLit ? lightOnColor : Color.darkGray);
  }

  // Event handler for mouse click (or touch release)
  onMouseUp (evt) {
    this.isLit = !this.isLit; // Toggle the 'isLit' property
    evt.stop(); // Stop event propagation to prevent it from affecting parent morphs
  }
}

// ===========================================================================
// 2. LightPanel Morph: A container for the four lights
// ===========================================================================
export class LightPanel extends Box {
  static get properties () {
    return {
      name: { defaultValue: 'LightPanel' },
      padding: { defaultValue: 20 } // Padding around the lights
    };
  }

  // Constructor: Creates and arranges the light morphs
  constructor (bounds = rect(0, 0, 260, 100)) {
    super(bounds); // Call the parent Box constructor

    this.fill = Color.lightgray;
    this.borderWidth = 2;
    this.borderColor = Color.gray;
    this.grabbable = true; // Allow the entire panel to be moved

    this.setupLights(); // Call a helper method to create and add lights
  }

  setupLights () {
    const lightSize = 50;
    const spacing = 10;
    let currentX = this.padding; // Start X position for the first light

    for (let i = 0; i < 4; i++) {
      // Create a new Light instance
      // const light = new Light(rect(currentX, this.padding, lightSize, lightSize));
      const light = new Light({ position: pt(currentX, this.padding), extent: pt(lightSize, lightSize) });
      this.addMorph(light); // Add the light as a submorph to the panel
      currentX += lightSize + spacing; // Move X for the next light
    }

    // Adjust the panel's size to fit the lights snugly
    const contentWidth = (lightSize * 4) + (spacing * 3) + (this.padding * 2);
    const contentHeight = lightSize + (this.padding * 2);
    this.extent = pt(contentWidth, contentHeight);
  }

  // // Optional: A convenient method to open this panel in the current world
  // openInWorld (world = World.current(), position = pt(100, 100)) {
  //   this.position = position;
  //   world.addMorph(this);
  //   // You might want to remove it from the World first if it's already there:
  //   // if (this.world()) this.remove();
  // }
}
