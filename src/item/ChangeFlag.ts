/* eslint-disable no-unused-vars */

export enum ChangeFlag {
    APPEARANCE = 0x1,
    CHILDREN = 0x2,
    INSERTION = 0x4,
    GEOMETRY = 0x8,
    MATRIX = 0x10,
    SEGMENTS = 0x20,
    STROKE = 0x40,
    STYLE = 0x80,
    ATTRIBUTE = 0x100,
    CONTENT = 0x200,
    PIXELS = 0x400,
    CLIPPING = 0x800,
    VIEW = 0x1000
}

export enum Change {
    CHILDREN = ChangeFlag.CHILDREN |
        ChangeFlag.GEOMETRY |
        ChangeFlag.APPEARANCE,
    INSERTION = ChangeFlag.INSERTION | ChangeFlag.APPEARANCE,
    GEOMETRY = ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    MATRIX = ChangeFlag.MATRIX | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    SEGMENTS = ChangeFlag.SEGMENTS |
        ChangeFlag.GEOMETRY |
        ChangeFlag.APPEARANCE,
    STROKE = ChangeFlag.STROKE | ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
    STYLE = ChangeFlag.STYLE | ChangeFlag.APPEARANCE,
    ATTRIBUTE = ChangeFlag.ATTRIBUTE | ChangeFlag.APPEARANCE,
    CONTENT = ChangeFlag.CONTENT | ChangeFlag.GEOMETRY | ChangeFlag.APPEARANCE,
    PIXELS = ChangeFlag.PIXELS | ChangeFlag.APPEARANCE,
    VIEW = ChangeFlag.VIEW | ChangeFlag.APPEARANCE
}
