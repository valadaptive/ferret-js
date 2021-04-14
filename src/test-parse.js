const fs = require('fs');

const parse = require('./parse');

const input = fs.readFileSync(process.argv[2], {encoding: 'utf-8'});

console.log(JSON.stringify(parse(input), null, '\t'));
