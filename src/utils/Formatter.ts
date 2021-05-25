type Point = {
    x: number
    y: number
}

type Size = {
    width: number
    height: number
}

/**
 * @name Formatter
 * @class
 * @private
 */
export default class Formatter {
    precision: number
    multiplier: number

    /**
     * @param {Number} [precision=5] the amount of fractional digits
     */
    constructor(precision?: number) {
        this.precision = precision || 5
        this.multiplier = Math.pow(10, this.precision)
    }

    /**
     * Utility function for rendering numbers as strings at a precision of
     * up to the amount of fractional digits.
     *
     * @param {Number} num the number to be converted to a string
     */
    number(value: number) {
        // It would be nice to use Number#toFixed() instead, but it pads with 0,
        // unnecessarily consuming space.
        // If precision is >= 16, don't do anything at all, since that appears
        // to be the limit of the precision (it actually varies).
        return this.precision < 16
            ? Math.round(value * this.multiplier) / this.multiplier
            : value
    }

    pair(val1: number, val2: number, separator: string) {
        return this.number(val1) + (separator || ',') + this.number(val2)
    }

    point(val: Point, separator: string): string {
        return this.number(val.x) + (separator || ',') + this.number(val.y)
    }

    size(val: Size, separator: string) {
        return (
            this.number(val.width) +
            (separator || ',') +
            this.number(val.height)
        )
    }

    rectangle(val: Point & Size, separator: string) {
        return (
            this.point(val, separator) +
            (separator || ',') +
            this.size(val, separator)
        )
    }

    static instance: Formatter
    static getInstance(): Formatter {
        return Formatter.instance || (Formatter.instance = new Formatter())
    }

    static number(value: number) {
        return Formatter.getInstance().number(value)
    }

    static pair(val1: number, val2: number, separator: string) {
        return Formatter.getInstance().pair(val1, val2, separator)
    }

    static point(val: Point, separator: string): string {
        return Formatter.getInstance().point(val, separator)
    }

    static size(val: Size, separator: string) {
        return Formatter.getInstance().size(val, separator)
    }

    static rectangle(val: Point & Size, separator: string) {
        return Formatter.getInstance().rectangle(val, separator)
    }
}
