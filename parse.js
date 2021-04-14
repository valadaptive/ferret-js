const ohm = require('ohm-js');

const grammar = ohm.grammar(
    `Ferret {
        space := " " | "\\t"
        Program = (Definition "\\n"*) +
        comment = ("//" (~"\\n" any)+)?
        text = (letter | digit | "%") +
        DerefType = Type "*"
        Type = DerefType | text
        Definition = "def" Type text Type* "{" "\\n" FunctionLine* "}"
        FunctionLine = (labelDef | Assignment | PtrAssignment | Return | Branch | Write | Expr) "\\n"+
        labelDef = text ":"
        labelRef = ":" text
        
        // TODO: handle escaped quotes inside string
        string = "\\"" (~"\\"" any)+ "\\""
        number = digit+
        literal = "\\\\NUL" | string | number
        
        derefRvalue = "*" rvalue
        rvalue = text | derefRvalue | literal
        
        DerefExpr = "*" Expr
        Expr = DerefExpr | ExprInner
        ExprInner = AddExpr | SubExpr | MulExpr | DivExpr | EqExpr | CallExpr | rvalue
        
        AddExpr = "add" rvalue rvalue
        SubExpr = "sub" rvalue rvalue
        MulExpr = "mul" rvalue rvalue
        DivExpr = "div" rvalue rvalue
        EqExpr = "eq" rvalue rvalue
        CallExpr = "call" text rvalue+
        
        derefLvalue = "*" lvalue
        lvalue = text | derefLvalue
        Assignment = lvalue "=" Expr
        PtrAssignment = lvalue "<-" Expr
        Return = "ret" rvalue
        Branch = "br" rvalue labelRef labelRef
        Write = "write" "stdout" rvalue rvalue
    }`);

const semantics = grammar.createSemantics();

const objMapInPlace = (obj, fn) => {
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        obj[key] = fn(obj[key]);
    }
    return obj;
};

const twoOpExpr = function(_name, op1, op2) {
    return {
        type: this.ctorName,
        op1: op1.toAST(),
        op2: op2.toAST()
    };
};

semantics.addOperation('toAST', {
    Program (defs, _) {
        return defs.children.map(def => def.toAST());
    },

    text (_) {
        return this.sourceString;
    },

    string (_startQuote, value, _endQuote) {
        // TODO: do we want this?
        // TODO: handle escaped quotes inside string
        return value.sourceString.replace(/\\NUL/g, '\0');
    },

    number (value) {
        // TODO: decide whether to use BigInt
        return value.sourceString;
    },

    literal (value) {
        return {
            type: 'literal',
            value: value.toAST()
        };
    },

    derefLvalue (_star, child) {
        return {
            type: 'derefLvalue',
            value: child.toAST()
        };
    },

    lvalue (child) {
        return {
            // TODO: unwrap this node?
            type: 'lvalue',
            value: child.toAST()
        };
    },

    derefRvalue (_star, child) {
        return {
            // NOTE: this "desugars" to an expression
            type: 'DerefExpr',
            value: child.toAST()
        };
    },

    rvalue (child) {
        return child.toAST();
    },

    Type (child) {
        return {
            type: 'Type',
            value: child.toAST()
        };
    },

    DerefType (child, _star) {
        return {
            type: 'DerefType',
            value: child.toAST()
        };
    },

    Definition (_def, outType, identifier, inTypes, _lbrace, _nl, lines, _rbrace) {
        return Object.assign({type: 'Definition'}, objMapInPlace({outType, identifier, inTypes, lines}, node => node.toAST()));
    },

    FunctionLine (child, _newlines) {
        return child.toAST();
    },

    labelDef (text, _colon) {
        return text.toAST();
    },

    labelRef (_colon, text) {
        return text.toAST();
    },

    Assignment (lvalue, _, expr) {
        return {
            type: 'Assignment',
            lvalue: lvalue.toAST(),
            expr: expr.toAST()
        };
    },

    PtrAssignment (lvalue, _, expr) {
        return {
            type: 'PtrAssignment',
            lvalue: lvalue.toAST(),
            expr: expr.toAST()
        };
    },

    Return (_ret, rvalue) {
        return {
            type: 'Return',
            value: rvalue.toAST()
        };
    },

    Branch (_br, condition, label1, label2) {
        return {
            type: 'Branch',
            condition: condition.toAST(),
            label1: label1.toAST(),
            label2: label2.toAST()
        };
    },

    Write (_write, _stdout, data, length) {
        return {
            type: 'Write',
            data: data.toAST(),
            length: length.toAST()
        };
    },

    DerefExpr (_star, child) {
        return {
            type: 'DerefExpr',
            value: child.toAST()
        };
    },

    Expr (child) {
        return child.toAST();
    },

    AddExpr: twoOpExpr,
    SubExpr: twoOpExpr,
    MulExpr: twoOpExpr,
    DivExpr: twoOpExpr,
    EqExpr: twoOpExpr,

    CallExpr(_call, identifier, args) {
        return {
            type: 'CallExpr',
            identifier: identifier.toAST(),
            args: args.children.map(arg => arg.toAST())
        };
    },

    _terminal () {
        return this.sourceString;
    }
});

const parse = input => {
    // Remove all comments beforehand
    const preprocessed = input.replace(/\/\/[^\n]+/g, '');

    const result = grammar.match(preprocessed);
    const ast = semantics(result).toAST();
    //console.log(ast);
    return ast;
};

module.exports = parse;