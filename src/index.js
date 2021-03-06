const fs = require('fs');

const parse = require('./parse');
const compile = require('./compile');

const input = fs.readFileSync(process.argv[2], {encoding: 'utf-8'});

console.log(JSON.stringify(compile(parse(input)), null, '\t'));
