const ohm = require('ohm-js');
const fs = require('fs');

const grammar = ohm.grammar(fs.readFileSync(require.resolve('./grammar.ohm')));

const parse = input => {
    // Remove all comments beforehand
    const preprocessed = input.replace(/\/\/[^\n]+/g, '');

    const result = grammar.match(preprocessed);
    return result;
}

module.exports = parse;