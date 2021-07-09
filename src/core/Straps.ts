export default class Straps {
    initialize(..._: any[]) {}

    protected constructor(...options: any[]) {
        this.initialize(...options)
    }

    static hidden = /^(statics|enumerable|beans|preserve)$/
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
        bind?: any
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

    static create(...args: any[]) {
        return Object.create(args[0])
    }

    /**
     * Injects the fields in this object from one ore passed multiply
     * objects.
     *
     * @param {...Object} objects one or multiple objects describing the
     *     fields to be injected in this object.
     */
    inject(...args: any[]) {
        for (let i = 0, l = args.length; i < l; i++) {
            const src = args[i]
            if (src) {
                this._inject(this, src, src.enumerable, src.beans, src.preserve)
            }
        }
        return this
    }

    private _inject(
        dest: Straps,
        src: any,
        enumerable: any,
        beans: any,
        preserve: any
    ) {
        const beansNames = {}

        function field(name: string, val?: any) {
            val =
                val ||
                ((val = Straps.describe(src, name)) &&
                    (val.get ? val : val.value))

            if (typeof val === 'string' && val[0] === '#')
                val = dest[val.substring(1)] || val
            const isFunc = typeof val === 'function'
            let res = val
            const prev =
                preserve || (isFunc && !val.base)
                    ? val && val.get
                        ? name in dest
                        : dest[name]
                    : null
            let bean
            if (!preserve || !prev) {
                if (isFunc && prev) val.base = prev

                if (
                    isFunc &&
                    beans !== false &&
                    (bean = name.match(/^([gs]et|is)(([A-Z])(.*))$/))
                )
                    beansNames[bean[3].toLowerCase() + bean[4]] = bean[2]

                if (
                    !res ||
                    isFunc ||
                    !res.get ||
                    typeof res.get !== 'function' ||
                    !Straps.isPlainObject(res)
                ) {
                    res = { value: res, writable: true }
                }

                if (
                    (Straps.describe(dest, name) || { configurable: true })
                        .configurable
                ) {
                    res.configurable = true
                    res.enumerable = enumerable != null ? enumerable : !bean
                }
                Straps.define(dest, name, res)
            }
        }
        if (src) {
            for (const name in src) {
                if (src.hasOwnProperty(name) && !Straps.hidden.test(name))
                    field(name)
            }
            // Now process the beans as well.
            for (const name in beansNames) {
                const part = beansNames[name]
                const set = dest['set' + part]
                const get = dest['get' + part] || (set && dest['is' + part])
                if (get && (beans === true || get.length === 0))
                    field(name, { get: get, set: set })
            }
        }

        return dest
    }
}
