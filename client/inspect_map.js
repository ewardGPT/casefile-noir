
const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public/assets/maps/victorian/city_map_split.json');
try {
    const data = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(data);
    console.log(`Map: ${map.width}x${map.height} tiles`);
    console.log("Layers:");
    map.layers.forEach(l => {
        let filledCount = 0;
        if (l.data) {
            filledCount = l.data.filter(t => t !== 0).length;
        }
        console.log(`- ${l.name} (${l.type}): ${filledCount} filled tiles`);
    });
} catch (e) {
    console.error(e);
}
