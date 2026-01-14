
const fs = require('fs');
const contents = fs.readFileSync('public/assets/maps/victorian/city_map_split.json', 'utf8');
const map = JSON.parse(contents);
console.log(`Map: ${map.width}x${map.height}`);
map.layers.forEach(l => {
    if (l.data) {
        const count = l.data.filter(x => x !== 0).length;
        const percent = ((count / (map.width * map.height)) * 100).toFixed(1);
        console.log(`${l.name}: ${count} (${percent}%)`);
    } else if (l.layers) {
        console.log(`${l.name} (Group)`);
    }
});
