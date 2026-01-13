const fs = require('fs');
const json = JSON.parse(fs.readFileSync('client/public/assets/maps/victorian/city_map_fixed.json', 'utf8'));

const out = json.tilesets.map((t, i) => {
    const cols = t.imagewidth / t.tilewidth;
    const rows = t.imageheight / t.tileheight;
    const count = cols * rows;
    return `${i}: ${t.name} (Start: ${t.firstgid}, Count: ${count}, End: ${t.firstgid + count}, Img: ${t.image}, W: ${t.imagewidth}, H: ${t.imageheight})`;
}).join('\n');

console.log(out);
fs.writeFileSync('gid_info.txt', out);
