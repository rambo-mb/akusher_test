import fs from "fs";
import { Resvg } from "@resvg/resvg-js";
import path from "path";

const svg = fs.readFileSync(path.join(process.cwd(), "docs/brand/logo.svg"), "utf8");
const resvg = new Resvg(svg, {
  background: "#ffffff",
  fitTo: { mode: "width", value: 512 }
});
const pngData = resvg.render();
const pngBuffer = pngData.asPng();
fs.writeFileSync(path.join(process.cwd(), "docs/brand/logo.png"), pngBuffer);
console.log("docs/brand/logo.png created successfully.");
