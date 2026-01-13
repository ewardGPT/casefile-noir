const fs = require('fs');
const json = JSON.parse(fs.readFileSync('client/public/assets/maps/victorian/city_map_fixed.json', 'utf8'));

console.log("Map Width:", json.width);
console.log("Map Height:", json.height);
console.log("Layers count:", json.layers.length);
console.log("Tilesets count:", json.tilesets ? json.tilesets.length : 'MISSING');

if (json.tilesets) {
    json.tilesets.forEach((ts, i) => {
        console.log(`Tileset ${i}: Name="${ts.name}", FirstGID=${ts.firstgid}, Image="${ts.image}", W=${ts.imagewidth}, H=${ts.imageheight}`);
    });
}
