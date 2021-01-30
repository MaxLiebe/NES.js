;Writes the address 0x4000 to zero page 0x42 and 0x43, then writes 69 to 0x4000, then stores 0 in the accumulator,
;then does an indexed indirect LDA with zero page 0x42 (and X = 0)    
    LDA #$00
    STA $42
    LDA #$40
    STA $43
    LDA #69
    STA $4000
    LDA #$00
    LDA ($42,X)