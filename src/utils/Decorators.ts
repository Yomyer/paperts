import { Base } from '../core'

/**
 * @deprecated
 */
export const InPrototype = (value: any) => {
    return (target: any, key: string) => {
        target[key] = value
    }
}

export const ReadIndex = () => {
    return (target: any) => {
        target.prototype._readIndex = true
    }
}

export const Exportable = () => {
    return (target: any) => {
        Base.exports[target.prototype.constructor.name] =
            target.prototype.constructor
    }
}
