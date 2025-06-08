import { component } from "lively.morphic/index.js";
import { pt } from "lively.graphics/geometry-2d.js";
import { Color } from "lively.graphics/color.js";
import { Brick } from "../breakout/index.js";
"format esm";
const ABrick = component({
  type: Brick,
  name: undefined,
  borderColor: Color.black,
  borderWidth: 1,
  extent: pt(84.5,25),
  fill: Color.rgb(255,0,0),
  position: pt(360.4,53.6)
});



export { ABrick }