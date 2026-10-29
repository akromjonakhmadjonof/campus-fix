import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(new URL("../package.json", import.meta.url));
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icons = require("lucide-react");
const scenes = [
  ["monitor", "Monitor", "Monitor"],
  ["faucet", "Faucet", "Droplets"],
  ["chair", "Chair", "Armchair"],
  ["projector", "Projector", "Projector"],
  ["outlet", "Power outlet", "Plug"],
  ["light", "Hallway light", "Lightbulb"],
  ["door", "Classroom door", "DoorOpen"],
  ["trash", "Waste bin", "Trash2"],
  ["sidewalk", "Sidewalk", "Footprints"],
  ["bench", "Outdoor bench", "Armchair"],
  ["printer", "Printer", "Printer"],
  ["ceiling", "Ceiling leak", "CloudRain"],
  ["restroom", "Restroom fixture", "Bath"],
  ["parking-light", "Parking light", "Lamp"],
  ["network", "Network connection", "Wifi"],
  ["safety", "Safety equipment", "FireExtinguisher"],
];
const target = new URL("../../api/seed-assets/expanded/", import.meta.url);
await mkdir(target, { recursive: true });
for (const [key, label, name] of scenes) {
  const icon = renderToStaticMarkup(
    React.createElement(icons[name], {
      width: 180,
      height: 180,
      strokeWidth: 1.35,
      color: "#1f3c6c",
    }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560"><rect width="800" height="560" fill="#f6f6f3"/><rect x="64" y="58" width="672" height="444" rx="28" fill="#e2e9f0"/><circle cx="400" cy="252" r="128" fill="#fbfaf7"/><g transform="translate(310 162)">${icon}</g><text x="400" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#1f3c6c">${label}</text><text x="400" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" letter-spacing="3" fill="#535861">FICTIONAL DEMO ILLUSTRATION</text></svg>`;
  await writeFile(new URL(key + ".svg", target), svg);
}
console.warn(
  `Created ${scenes.length} original local demo illustrations using the installed Lucide icons.`,
);
