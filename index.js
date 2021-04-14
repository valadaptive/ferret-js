const fs = require('fs');

const util = require('util');

const lex = require('./parser/lex');
const parse = require('./parser/parse-ohm');

const input = fs.readFileSync(process.argv[2], {encoding: 'utf-8'});

console.log(parse(input));
/*console.log(util.inspect(parse(`def i1 main { //boolean 0 for success, 1 for failure
    str = "Hello, world!\NUL" //str has type u8*
    call print str
    //another implied 'ret 0'
  }
  `), {depth: null}))*/