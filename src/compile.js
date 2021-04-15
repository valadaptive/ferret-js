/*
Instructions:
ADD OP1 OP2 DST - adds the values of two registers, storing the result in DST
SUB OP1 OP2 DST - subtracts OP2 from OP1, storing the result in DST
MUL OP1 OP2 DST - multiplies the values of two registers, storing the result in DST
DIV OP1 OP2 DST - divides OP1 by OP2, storing the result in DST
EQ OP1 OP2 DST - sets DST to 1 if OP1 is equal to OP2, or 0 if not

MOV SRC DST - copies the value of register SRC to DST
LOAD ADDR DST - loads the given value from the address pointed to by the given register
STORE ADDR VAL - stores the given value at the address pointed to by the given register

BR COND label1 label2 - jumps to label1 if COND = 1, or label2 if COND = 0
RET VAL - returns the given value from the function

CALL func DST ...ARG - calls the given function, storing the result in DST, passing in the given arguments

WRITE PTR LEN - writes LEN bytes to stdout from the address pointed to by PTR
*/

class Block {
    constructor (label) {
        this.label = label;
        this.instructions = [];
        // this.predecessors = [];
        this.successors = [];
    }
}

class Constants {
    constructor () {
        this.data  = [];
    }

    store (constant) {
        return `@.${this.data.push(constant) - 1}`;
    }
}

class FunctionCompiler {
    constructor (definition, constants) {
        this.definition = definition;
        this.constants = constants;
        this.locals = [];

        /**
         * Used for naming registers.
         * The first n numbered registers will be the function's parameters.
         * Start counting from there.
         */
        this.registerCounter = definition.inTypes.length;
    }

    nextRegister () {
        return `%${this.registerCounter++}`;
    }

    compileLiteral (value) {
        if (value === '\\NUL') return '0';
        switch (value.type) {
        case 'number': return value.value;
        case 'string': return this.constants.store(value.value);
        }
    }

    /**
     * Compile some type of expression.
     * @param {Expr | rvalue} value
     * @param {Block} block
     * @returns {string} The register which contains the result of the expression.
     */
    compileExpr (expr, block) {
        const value = expr.type === 'rvalue' ? expr : expr.value;
        switch (value.type) {
        case 'DerefExpr': {
            const evaled = this.compileExpr(value.value, block);
            const register = this.nextRegister();
            block.instructions.push(['LOAD', evaled, register]);
            return register;
        }

        case 'AddExpr':
        case 'SubExpr':
        case 'MulExpr':
        case 'DivExpr':
        case 'EqExpr': {
            const instructionMap = {
                AddExpr: 'ADD',
                SubExpr: 'SUB',
                MulExpr: 'MUL',
                DivExpr: 'DIV',
                EqExpr: 'EQ'
            };
            const op1 = this.compileExpr(value.op1, block);
            const op2 = this.compileExpr(value.op2, block);
            const register = this.nextRegister();
            block.instructions.push([instructionMap[value.type], op1, op2, register]);
            return register;
        }

        case 'CallExpr': {
            const compiledArgs = value.args.map(arg => this.compileExpr(arg, block));
            const register = this.nextRegister();
            block.instructions.push(['CALL', value.identifier, register, ...compiledArgs]);
            return register;
        }

        case 'rvalue': {
            if (typeof value.value === 'string') {
                return value.value;
            }
            switch (value.value.type) {
            case 'literal': return this.compileLiteral(value.value.value);
            default: return this.compileExpr(value.value.value, block);
            }
        }

        default: throw new Error(`Cannot compile expression of type ${value.type}`);
        }
    }

    compileDerefLvalue (lvalue, block) {
        if (typeof lvalue === 'string') {
            if (this.locals.indexOf(lvalue) === -1) {
                this.locals.push(lvalue);
            }
            // writing directly to an address
            return lvalue;
        } else {
            // writing to a pointer--recurse!
            const register = this.compileDerefLvalue(lvalue.value, block);
            const storeRegister = this.nextRegister();
            block.instructions.push(['LOAD', register, storeRegister]);
            return storeRegister;
        }
    }

    compileAssignment (assignment, block) {
        const resultRegister = this.compileExpr(assignment.expr, block);
        if (typeof assignment.lvalue === 'string') {
            // assigning to a register
            // TODO: optional register argument to avoid unnecessary MOV
            block.instructions.push(['MOV', resultRegister, assignment.lvalue]);
        } else {
            // this must be a derefLvalue node
            const addrRegister = this.compileDerefLvalue(assignment.lvalue.value, block);
            block.instructions.push(['STORE', addrRegister, resultRegister]);
        }
    }

    compilePtrAssignment (assignment, block) {
        const resultRegister = this.compileExpr(assignment.expr, block);
        const addrRegister = this.compileDerefLvalue(assignment.lvalue, block);
        block.instructions.push(['STORE', addrRegister, resultRegister]);
    }

    compileReturn (ret, block) {
        block.instructions.push(['RET', this.compileExpr(ret.value, block)]);
    }

    compileBranch (branch, block) {
        block.successors.push(branch.label1, branch.label2);
        const register = this.compileExpr(branch.condition, block);
        block.instructions.push(['BR', register, branch.label1, branch.label2]);
    }

    compileWrite (write, block) {
        block.instructions.push(['WRITE', this.compileExpr(write.data, block), this.compileExpr(write.length, block)]);
    }

    /**
     * Compiles a single line in a block.
     * @param {Assignment | PtrAssignment | Return | Branch | Write | Expr} line
     * @param {Block} block
     * @returns {boolean} true if this line terminates a block.
     */
    compileLine (line, block) {
        switch (line.type) {
        case 'Assignment':
            this.compileAssignment(line, block);
            break;
        case 'PtrAssignment':
            this.compilePtrAssignment(line, block);
            break;
        case 'Return':
            this.compileReturn(line, block);
            break;
        case 'Branch':
            this.compileBranch(line, block);
            break;
        case 'Write':
            this.compileWrite(line, block);
            break;
        case 'Expr':
            this.compileExpr(line, block);
            break;
        default:
            throw new Error(`Unknown AST node type: ${line.type}`);
        }
        
        return line.type === 'Branch' || line.type === 'Return';
    }

    compileFunction () {
        const {definition} = this;
        const {lines} = definition;
        const blocks = [];
    
        let currentBlock = new Block('init');
        let hasPrevBlock = false;
        let blockTerminated = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.type === 'labelDef') {
                if (!blockTerminated && hasPrevBlock) throw new Error(`Block "${currentBlock.label}" falls through`);
                blocks.push(currentBlock);
                // TODO: actually handle block name collisions instead of whatever this is
                currentBlock = new Block(line.value === 'init' ? 'init1' : line.value);
                hasPrevBlock = true;
                blockTerminated = false;
            } else {
                if (blockTerminated) throw new Error(`Unreachable code after control flow in block "${currentBlock.label}"`);
                blockTerminated = blockTerminated || this.compileLine(line, currentBlock);
            }
        }
        // TODO: does this happen for all blocks or just the last one?
        if (!blockTerminated) {
            currentBlock.instructions.push(['RET', '0']);
        }
        blocks.push(currentBlock);
    
        return {
            identifier: definition.identifier,
            inTypes: definition.inTypes,
            outType: definition.outType,
            blocks,
            locals: this.locals
        };
    }
}

const compileProgram = ast => {
    const {definitions} = ast;

    const defMap = {};

    const constants = new Constants();

    for (const definition of definitions) {
        const {identifier} = definition;
        if (identifier in defMap) throw new Error(`Duplicate definition of function "${identifier}"`);
        defMap[identifier] = definition;
    }

    return definitions.map(def => (new FunctionCompiler(def, constants)).compileFunction());
};

module.exports = compileProgram;
