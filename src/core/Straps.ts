export default abstract class Straps {
    initialize(..._: any[]) {}

    protected constructor(...options: any[]) {
        this.initialize(options)
    }

    static define = Object.defineProperty
    static describe = Object.getOwnPropertyDescriptor

    static forIn(iter: any, bind: any) {
        for (const i in this) {
            if (this.hasOwnProperty(i)) iter.call(bind, this[i], i, this)
        }
    }

    static each(
        obj: object,
        iter: (callbackfn: any, thisArg?: any) => void,
        bind: any
    ) {
        if (obj) {
            const desc = Object.getOwnPropertyDescriptor(obj, 'length')

            ;(desc && typeof desc.value === 'number'
                ? [].forEach
                : this.forIn
            ).call(obj, iter, (bind = bind || obj))
        }
        return bind
    }

    static set = Object.assign

    static clone(obj: any) {
        return this.set(new obj.constructor(), obj)
    }

    static pick(a: any, b: any) {
        return a !== undefined ? a : b
    }

    static isPlainObject(obj: any) {
        const ctor = obj != null && obj.constructor

        return (
            ctor &&
            (ctor === Object || ctor === Straps || ctor.name === 'Object')
        )
    }

    static slice(list: any, begin: any, end?: any) {
        return [].slice.call(list, begin, end)
    }

    static create = Object.create
}
