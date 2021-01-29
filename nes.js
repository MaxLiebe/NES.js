
let a = 0x00; //A register (BYTE)
let x = 0x00; //X register (BYTE)
let y = 0x00; //Y register (BYTE)
let pc = 0x8000; //Program counter (WORD) (little endian)
let sp = 0x00; //Stack pointer (BYTE)
let st = 0x00; //Status register (BYTE)
/*Description of what each flag in the status register does (little endian)
Bit 7: N | Negative
Bit 6: V | Overflow
Bit 5: - (unused)
Bit 4: B | Break
Bit 3: D | Decimal
Bit 2: I | Interrupt Disable
Bit 1: Z | Zero
Bit 0: C | Carry
*/

const stackOffset = 0x0100; //offset in memory to the stack
const generalOffset = 0x0200; //offset in memory to the general-use memory
const op = { //all available operations and their opcodes in the 6502
    LDA_IMMEDIATE: 0xA9,
    STA_ABSOLUTE: 0x8d
};
const adm = { //all available addressing modes used in operations
    IMMEDIATE: 0, //interpret as raw value
    ABSOLUTE: 1 //refer to raw memory address
};
const err = {
    WRONG_ADDRESSING_MODE: 0x00
};

let memory = []; //the 6502 has an address space of 64 kilobytes. (65536 bytes)

//TEST PROGRAM
memory[0x8000] = op.LDA_IMMEDIATE;
memory[0x8001] = 0xAA;
memory[0x8002] = op.STA_ABSOLUTE;
memory[0x8003] = 0x00;
memory[0x8004] = 0x40;

const readFromAddress = addr => {
    return memory[addr] || null;
}

const writeAtAddress = (addr, value) => {
    memory[addr] = value;
}

const readBytes = bytes => {
    let result = [];
    for (let i = 0; i < bytes; ++i) {
        result.push(readFromAddress(pc + i));
    }
    pc += bytes;
    return result;
}

const readInstruction = () => {
    let instruction = readFromAddress(pc);
    if (instruction === null) return false;
    pc++;
    executeInstruction(instruction);
    return true;
};

const executeInstruction = instruction => {
    switch (instruction) {
        case op.LDA_IMMEDIATE: lda(adm.IMMEDIATE); break;
        case op.STA_ABSOLUTE: sta(adm.ABSOLUTE); break;
    }
};

const lda = addressingMode => { //load value into accumulator
    let value;
    switch (addressingMode) {
        case adm.IMMEDIATE: value = readBytes(1).getByte(); break;
        default: error(err.WRONG_ADDRESSING_MODE); break;
    }
    a = value;
}

const sta = addressingMode => { //store accumulator in memory
    let address;
    switch (addressingMode) {
        case adm.ABSOLUTE: address = readBytes(2).getWord(); break;
        default: error(err.WRONG_ADDRESSING_MODE); break;
    }
    writeAtAddress(address, a);
}

Array.prototype.getByte = function () {
    return this[0];
};

Array.prototype.getWord = function () {
    return (this[1] << 8) + this[0];
};

const error = code => {
    console.log('haha whoops error');
}

while (readInstruction()) { }