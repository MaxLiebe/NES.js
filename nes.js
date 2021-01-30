const fs = require('fs');
const rom = fs.readFileSync('test');

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
    //LDA operations
    LDA_IMMEDIATE: 0xA9,
    LDA_ABSOLUTE: 0xAD,
    LDA_ABSOLUTE_X: 0xBD,
    LDA_ABSOLUTE_Y: 0xB9,
    LDA_ZEROPAGE: 0xA5,
    LDA_ZEROPAGE_X: 0xB5,
    LDA_INDIRECT_X: 0xA1,
    LDA_INDIRECT_Y: 0xB1,

    //STA operations
    STA_ABSOLUTE: 0x8D,
    STA_ABSOLUTE_X: 0x9D,
    STA_ABSOLUTE_Y: 0x99,
    STA_ZEROPAGE: 0x85,
    STA_ZEROPAGE_X: 0x95,
    STA_INDIRECT_X: 0x81,
    STA_INDIRECT_Y: 0x91
};
const adm = { //all available addressing modes used in operations
    IMMEDIATE: 0, //interpret as raw value
    ABSOLUTE: 1, //refer to raw memory address
    ABSOLUTE_X: 2, //refer to raw memory address + x register
    ABSOLUTE_Y: 3, //refer to raw memory address + y register
    ZEROPAGE: 4, //refer to an address in the zero page
    ZEROPAGE_X: 5, //refer to an address in the zero page + x register
    ZEROPAGE_Y: 6, //refer to an address in the zero page + y register
    INDIRECT_X: 7, //refer to the address stored at the given (address + x)
    INDIRECT_Y: 8, //refer to the (address stored at the given address) + y

};
const err = {
    WRONG_ADDRESSING_MODE: 0x00
};

let memory = []; //the 6502 has an address space of 64 kilobytes. (65536 bytes)
memory[0x7fff] = 0x00;
memory = memory.concat(Array.from(rom));

const readByte = addr => { //read a byte from a memory address
    return memory[addr];
}

const readWord = addr => { //read a word from a memory address (and convert to big endian)
    return (memory[addr + 1] << 8) + memory[addr];
}

const writeByte = (addr, value) => { //write a byte at a memory address
    memory[addr] = value;
}

const readPcByte = () => {
    let result = readByte(pc);
    pc++;
    return result;
}

const readPcWord = () => {
    let result = readWord(pc);
    pc += 2;
    return result;
}

const readInstruction = () => {
    let instruction = readPcByte(pc);
    if (!instruction) return false;
    executeInstruction(instruction);
    return true;
};

const executeInstruction = instruction => {
    switch (instruction) {
        //LDA instructions
        case op.LDA_IMMEDIATE: lda(adm.IMMEDIATE); break;
        case op.LDA_ABSOLUTE: lda(adm.ABSOLUTE); break;
        case op.LDA_ABSOLUTE_X: lda(adm.ABSOLUTE_X); break;
        case op.LDA_ABSOLUTE_Y: lda(adm.ABSOLUTE_Y); break;
        case op.LDA_ZEROPAGE: lda(adm.ZEROPAGE); break;
        case op.LDA_ZEROPAGE_X: lda(adm.ZEROPAGE_X); break;
        case op.LDA_ZEROPAGE_Y: lda(adm.ZEROPAGE_Y); break;
        case op.LDA_INDIRECT_X: lda(adm.INDIRECT_X); break;
        case op.LDA_INDIRECT_Y: lda(adm.INDIRECT_Y); break;

        //STA instructions
        case op.STA_ABSOLUTE: sta(adm.ABSOLUTE); break;
        case op.STA_ABSOLUTE_X: sta(adm.ABSOLUTE_X); break;
        case op.STA_ABSOLUTE_Y: sta(adm.ABSOLUTE_Y); break;
        case op.STA_ZEROPAGE: sta(adm.ZEROPAGE); break;
        case op.STA_ZEROPAGE_X: sta(adm.ZEROPAGE_X); break;
        case op.STA_INDIRECT_X: sta(adm.INDIRECT_X); break;
        case op.STA_INDIRECT_Y: sta(adm.INDIRECT_Y); break;
    }
};

const lda = addressingMode => { //load value into accumulator
    let value;
    switch (addressingMode) {
        case adm.IMMEDIATE: {
            value = readPcByte();
            break;
        }
        case adm.ABSOLUTE: {
            let address = readPcWord();
            value = readByte(address);
            break;
        }
        case adm.ABSOLUTE_X: {
            let address = readPcWord() + x;
            value = readByte(address);
            break;
        }
        case adm.ABSOLUTE_Y: {
            let address = readPcWord() + y;
            value = readByte(address);
            break;
        }
        case adm.ZEROPAGE: {
            let address = readPcByte();
            value = readByte(address);
            break;
        }
        case adm.ZEROPAGE_X: {
            let address = readPcByte() + x;
            value = readByte(address);
            break;
        }
        case adm.ZEROPAGE_Y: {
            let address = readPcByte() + y;
            value = readByte(address);
            break;
        }
        case adm.INDIRECT_X: {
            let initialAddress = readPcByte() + x;
            let retrievedAddress = readWord(initialAddress);
            value = readByte(retrievedAddress);
            break;
        }
        case adm.INDIRECT_Y: {
            let initialAddress = readPcByte();
            let retrievedAddress = readWord(initialAddress) + y;
            value = readByte(retrievedAddress);
            break;
        }
        default: error(err.WRONG_ADDRESSING_MODE); break;
    }
    a = value; //update value in the accumulator

    //set zero flag, 1 if a = 0, otherwise 0
    if (a === 0) st = st | 0b00000010;
    else st = st ^ 0b00000010;

    //set negative flag, 1 if bit 7 of a is set (a is negative), otherwise 0
    if ((a & 0b00000001) << 7 === 1) st = st | 0b00000001;
    else st = st ^ 0b00000001;
}

const sta = addressingMode => { //store accumulator in memory
    let address;
    switch (addressingMode) {
        case adm.ABSOLUTE: {
            address = readPcWord();
            break;
        }
        case adm.ABSOLUTE_X: {
            address = readPcWord() + x;
            break;
        }
        case adm.ABSOLUTE_Y: {
            address = readPcWord() + y;
            break;
        }
        case adm.ZEROPAGE: {
            address = readPcByte();
            break;
        }
        case adm.ZEROPAGE_X: {
            address = readPcByte() + x;
            break;
        }
        case adm.ZEROPAGE_Y: {
            address = readPcByte() + y;
            break;
        }
        case adm.INDIRECT_X: {
            let initialAddress = readPcByte() + x;
            address = readWord(initialAddress);
            break;
        }
        case adm.INDIRECT_Y: {
            let initialAddress = readPcByte();
            address = readWord(initialAddress) + y;
            break;
        }
        default: error(err.WRONG_ADDRESSING_MODE); break;
    }
    writeByte(address, a);
}

const error = code => {
    console.log('haha whoops error');
}

while (readInstruction()) {
}

console.log(`Final result in accumulator: 0x${a.toString(16)} (${a})`);