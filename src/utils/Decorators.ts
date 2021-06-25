import { Base } from '../core'

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
