import * as genai from '@google/genai';
const keys = Object.keys(genai);
console.log('Starts with C:', keys.filter(k => k.startsWith('C')));
console.log('Starts with G:', keys.filter(k => k.startsWith('G')));
console.log('Has Client?', keys.includes('Client'));
console.log('Has GoogleGenerativeAI?', keys.includes('GoogleGenerativeAI'));
