import { Straps, Formatter, Change, ChangeFlag, Item, Layer } from '../'

// import Item from '../item/Item'
// import Layer from '../item/Layer'

export type ExportJsonOptions = {
    asString?: boolean
    precision?: number
    formatter?: Formatter
}

export type Dictionary = {
    length: 0
    definitions: {}
    references: { [key: string]: Base } | string[]
    add: (item: Base, create: () => string) => string
}

export class Base extends Straps {
    protected _id: string
    protected _name: string
    protected _index?: number
    protected _serialize?(
        _options?: ExportJsonOptions,
        _dictionary?: Dictionary
    ): any

    // Todo into item
    protected _changed?(flag?: ChangeFlag | Change | Base, ...args: any[]): any
    protected _prioritize?: string[]
    protected _compactSerialize?: boolean
    protected _readIndex?: boolean
    protected __read: any
    protected __filtered: any

    enumerable: boolean

    constructor(..._args: any[]) {
        super()
    }

    equals(..._: any[]): boolean {
        return false
    }

    clone(): this {
        return Base.clone(this)
    }

    changed(flag?: ChangeFlag | Change | Base, ...args: any[]) {
        return this._changed(flag, ...args)
    }

    /**
     * The unique id of the item.
     *
     * @bean
     * @type Number
     */
    getId() {
        return this._id
    }

    setId(id: string) {
        this._id = id
    }

    get id() {
        return this._id
    }

    set id(id: string) {
        this._id = id
    }

    /**
     * Renders base objects to strings in object literal notation.
     */
    toString(): string {
        return this._id != null
            ? (this._class || 'Object') +
                  (this._name ? " '" + this._name + "'" : ' @' + this._id)
            : '{ ' +
                  Base.each(
                      this,
                      function (this: string[], value, key) {
                          if (!/^_/.test(key)) {
                              const type = typeof value
                              this.push(
                                  key +
                                      ': ' +
                                      (type === 'number'
                                          ? Formatter.number(+value)
                                          : type === 'string'
                                          ? "'" + value + "'"
                                          : value)
                              )
                          }
                      },
                      []
                  ).join(', ') +
                  ' }'
    }

    /**
     * The class name of the object as a string, if the prototype defines a
     * `_class` value.
     *
     */
    getClassName(): string {
        return this._class || ''
    }

    get className(): string {
        return this._class
    }

    get class() {
        return this.getClassName()
    }

    /**
     * Imports (deserializes) the stored JSON data into the object, if the
     * classes match. If they do not match, a newly created object is returned
     * instead.
     *
     * @param {String} json the JSON data to import from
     */
    importJSON(json: string): this {
        return Base.importJSON(json, this) as this
    }

    /**
     * Exports (serializes) this object to a JSON data object or string.
     *
     * @option [options.asString=true] {Boolean} whether the JSON is returned as
     *     a `Object` or a `String`
     * @option [options.precision=5] {Number} the amount of fractional digits in
     *     numbers used in JSON data
     *
     * @param {Object} [options] the serialization options
     * @return {String} the exported JSON data
     */

    exportJSON(options?: ExportJsonOptions): string {
        return Base.exportJSON(this, options)
    }

    toJSON() {
        return Base.serialize(this)
    }

    /**
     * #set() is part of the mechanism for constructors which take one object
     * literal describing all the properties to be set on the created instance.
     * Through {@link Base.filter()} it supports `_filtered`
     * handling as required by the {@link Base.readNamed()} mechanism.
     *
     * @param {Object} props an object describing the properties to set
     * @param {Object} [exclude] an object that can define any properties as
     *     `true` that should be excluded
     * @return {Object} a reference to `this`, for chainability.
     */
    set(props: Object, exclude?: Object): this {
        if (props) Base.filter(this, props, exclude, this._prioritize)
        return this
    }

    // Statics
    static exports: { [key: string]: typeof Base } = {}

    static exportJSON(obj: Base, options?: ExportJsonOptions): string {
        const json = Base.serialize(obj, options)
        return options && options.asString === false
            ? json
            : JSON.stringify(json)
    }

    static importJSON<T extends typeof Base>(
        this: T,
        json: string,
        target?: any
    ): InstanceType<T> {
        return Base.deserialize(
            typeof json === 'string' ? JSON.parse(json) : json,

            function (Ctor: any, args: any, isRoot: boolean) {
                const useTarget =
                    isRoot && target && target.constructor === Ctor

                const obj = useTarget ? target : Base.create(Ctor.prototype)

                // Todo usar Item y Layer
                if (
                    args.length === 1 &&
                    obj instanceof Item &&
                    (useTarget || !(obj instanceof Layer))
                ) {
                    const arg = args[0]
                    if (Base.isPlainObject(arg)) {
                        arg.insert = false

                        if (useTarget) {
                            args = args.concat([{ insert: true }])
                        }
                    }
                }

                if (useTarget) target = null
                return useTarget ? obj.set(...args) : new Ctor(...args)
            }
        ) as InstanceType<T>
    }

    static serialize(
        obj: any,
        options?: ExportJsonOptions,
        compact?: boolean,
        dictionary?: Dictionary
    ): string {
        options = options || {}

        const isRoot = !dictionary
        let res: any
        if (isRoot) {
            options.formatter = new Formatter(options.precision)
            dictionary = {
                length: 0,
                definitions: {},
                references: {},
                add: function (this: Dictionary, item: Base, create: () => {}) {
                    const id = '#' + item._id
                    let ref = this.references[id]
                    if (!ref) {
                        this.length++
                        res = create.call(item)
                        const name = item._class
                        if (name && res[0] !== name) res.unshift(name)
                        this.definitions[id] = res

                        ref = this.references[id] = [id]
                    }
                    return ref
                }
            }
        }

        if (obj && obj._serialize) {
            res = obj._serialize(options, dictionary)

            const name = obj._class

            if (
                name &&
                !obj._compactSerialize &&
                (isRoot || !compact) &&
                res[0] !== name
            ) {
                res.unshift(name)
            }
        } else if (Array.isArray(obj)) {
            res = []
            for (let i = 0, l = obj.length; i < l; i++)
                res[i] = Base.serialize(obj[i], options, compact, dictionary)
        } else if (Base.isPlainObject(obj)) {
            res = {}
            const keys = Object.keys(obj)
            for (let i = 0, l = keys.length; i < l; i++) {
                const key = keys[i]
                res[key] = Base.serialize(
                    obj[key],
                    options,
                    compact,
                    dictionary
                )
            }
        } else if (typeof obj === 'number') {
            res = options.formatter.number(obj)
        } else {
            res = obj
        }
        return isRoot && dictionary.length > 0
            ? [['dictionary', dictionary.definitions], res]
            : res
    }

    static deserialize(
        json: any,
        create: any,
        _data?: any,
        _setDictionary?: boolean,
        _isRoot?: boolean
    ) {
        let res = json
        const isFirst = !_data
        const hasDictionary =
            isFirst && json && json.length && json[0][0] === 'dictionary'

        _data = _data || {}
        if (Array.isArray(json)) {
            let Type = json[0]

            const isDictionary = Type === 'dictionary'

            if (json.length === 1 && /^#/.test(Type)) {
                return _data.dictionary[Type]
            }
            Type = Base.exports[Type]
            res = []

            for (let i = Type ? 1 : 0, l = json.length; i < l; i++) {
                res.push(
                    this.deserialize(
                        json[i],
                        create,
                        _data,
                        isDictionary,
                        hasDictionary
                    )
                )
            }

            if (Type) {
                const args = res
                if (create) {
                    res = create(Type, args, isFirst || _isRoot)
                } else {
                    res = new Type(args)
                }
            }
        } else if (Base.isPlainObject(json)) {
            res = {}

            if (_setDictionary) _data.dictionary = res
            for (const key in json)
                res[key] = this.deserialize(json[key], create, _data)
        }

        return hasDictionary ? res[1] : res
    }

    /**
     * Copies all properties from `source` over to `dest`, supporting
     * `_filtered` handling as required by {@link Base.readNamed()} mechanism,
     * as well as a way to exclude and prioritize properties.
     *
     * @param {Object} dest the destination that is to receive the properties
     * @param {Object} source the source from where to retrieve the properties
     *     to be copied
     * @param {Object} [exclude] an object that can define any properties as
     *     `true` that should be excluded when copying
     * @param {String[]} [prioritize] a list of keys that should be prioritized
     *     when copying, if they are defined in `source`, processed in the order
     *     of appearance
     */
    static filter(
        dest: Object,
        source: Object & { __unfiltered?: boolean },
        exclude: Object,
        prioritize?: string[]
    ) {
        let processed: {}

        function handleKey(key: string) {
            if (
                !(exclude && key in exclude) &&
                !(processed && key in processed)
            ) {
                const value = source[key]
                if (value !== undefined) dest[key] = value
            }
        }

        if (prioritize) {
            const keys = {}
            for (let i = 0, key, l = prioritize.length; i < l; i++) {
                if ((key = prioritize[i]) in source) {
                    handleKey(key)
                    keys[key] = true
                }
            }
            processed = keys
        }

        Object.keys(source.__unfiltered || source).forEach(handleKey)
        return dest
    }

    static equals(obj1: Object, obj2: Object): boolean {
        if (obj1 === obj2) return true

        if (obj1 && obj1 instanceof Base) return obj1.equals(obj2)
        if (obj2 && obj2 instanceof Base) return obj2.equals(obj1)

        if (
            obj1 &&
            obj2 &&
            typeof obj1 === 'object' &&
            typeof obj2 === 'object'
        ) {
            if (Array.isArray(obj1) && Array.isArray(obj2)) {
                let length = obj1.length
                if (length !== obj2.length) return false
                while (length--) {
                    if (!Base.equals(obj1[length], obj2[length])) return false
                }
            } else {
                const keys = Object.keys(obj1)
                let length = keys.length

                if (length !== Object.keys(obj2).length) return false
                while (length--) {
                    const key = keys[length]
                    if (
                        !(
                            obj2.hasOwnProperty(key) &&
                            Base.equals(obj1[key], obj2[key])
                        )
                    )
                        return false
                }
            }
            return true
        }
        return false
    }

    /**
     * When called on a subclass of Base, it reads arguments of the type of the
     * subclass from the passed arguments list or array, at the given index, up
     * to the specified length. When called directly on Base, it reads any value
     * without conversion from the passed arguments list or array. This is used
     * in argument conversion, e.g. by all basic types (Point, Size, Rectangle)
     * and also higher classes such as Color and Segment.
     *
     * @param {Array} list the list to read from, either an arguments object or
     *     a normal array
     * @param {Number} start the index at which to start reading in the list
     * @param {Object} options `options.readNull` controls whether null is
     *     returned or converted. `options.clone` controls whether passed
     *     objects should be cloned if they are already provided in the required
     *     type
     * @param {Number} length the amount of elements that can be read
     */
    static read<T extends typeof Base>(
        this: T,
        list: any,
        start?: number,
        options?: { readNull?: boolean; clone?: boolean },
        amount?: number
    ): InstanceType<T> {
        if (this === Base) {
            const value = this.peek(list, start)
            list.__index++
            return value
        }
        const proto = this.prototype
        const readIndex = proto._readIndex
        const begin = start || (readIndex && list.__index) || 0
        const length = list.length
        let obj = list[begin]
        amount = amount || length - begin

        if (
            obj instanceof this ||
            (options && options.readNull && obj == null && amount <= 1)
        ) {
            if (readIndex) list.__index = begin + 1
            return obj && options && options.clone ? obj.clone() : obj
        }

        obj = Base.create(proto)
        if (!obj._class) {
            obj._class =
                Base.exports[obj.constructor.name] && obj.constructor.name
        }

        if (readIndex) obj.__read = true

        const listArgs =
            begin > 0 || begin + amount < length
                ? Base.slice(list, begin, begin + amount)
                : list
        obj = obj.initialize(...listArgs) || obj

        if (readIndex) {
            list.__index = begin + obj.__read
            const filtered = obj.__filtered
            if (filtered) {
                list.__filtered = filtered
                obj.__filtered = undefined
            }
            obj.__read = undefined
        }
        return obj as InstanceType<T>
    }

    /**
     * Allows peeking ahead in reading of values and objects from arguments
     * list through Base.read().
     *
     * @param {Array} list the list to read from, either an arguments object
     * or a normal array
     * @param {Number} start the index at which to start reading in the list
     */
    static peek(list: any, start?: number) {
        return list[(list.__index = start || list.__index || 0)]
    }

    /**
     * Returns how many arguments remain to be read in the argument list.
     */
    static remain(list: any) {
        return list.length - (list.__index || 0)
    }

    /**
     * Reads all readable arguments from the list, handling nested arrays
     * separately.
     *
     * @param {Array} list the list to read from, either an arguments object
     *     or a normal array
     * @param {Number} start the index at which to start reading in the list
     * @param {Object} options `options.readNull` controls whether null is
     *     returned or converted. `options.clone` controls whether passed
     *     objects should be cloned if they are already provided in the
     *     required type
     * @param {Number} amount the amount of elements that should be read
     */
    static readList<T extends typeof Base>(
        this: T,
        list: any,
        start?: any,
        options?: any,
        amount?: any
    ): Array<InstanceType<T>> {
        const res = []
        let entry
        const begin = start || 0
        const end = amount ? begin + amount : list.length
        for (let i = begin; i < end; i++) {
            res.push(
                Array.isArray((entry = list[i]))
                    ? this.read(entry, 0, options)
                    : this.read(list, i, options, 1)
            )
        }
        return res as Array<InstanceType<T>>
    }

    /**
     * Allows using of `Base.read()` mechanism in combination with reading named
     * arguments form a passed property object literal. Calling
     * `Base.readNamed()` can read both from such named properties and normal
     * unnamed arguments through `Base.read()`. In use for example for
     * the various `Path` constructors in `Path.Constructors.js`.
     *
     * @param {Array} list the list to read from, either an arguments object or
     *     a normal array
     * @param {String} name the property name to read from
     * @param {Number} start the index at which to start reading in the list
     * @param {Object} options `options.readNull` controls whether null is
     *     returned or converted. `options.clone` controls whether passed
     *     objects should be cloned if they are already provided in the required
     *     type
     * @param {Number} amount the amount of elements that can be read
     */

    static readNamed<T extends typeof Base>(
        this: T,
        list: any,
        name?: any,
        start?: any,
        options?: any,
        amount?: any
    ): InstanceType<T> {
        const value = this.getNamed(list, name)
        const hasValue = value !== undefined
        if (hasValue) {
            let filtered = list.__filtered
            if (!filtered) {
                const source = this.getSource(list)
                filtered = list.__filtered = Base.create(source)

                filtered.__unfiltered = source
            }

            filtered[name] = undefined
        }
        return this.read(hasValue ? [value] : list, start, options, amount)
    }

    /**
     * If `list[0]` is a source object, calls `Base.readNamed()` for each key in
     * it that is supported on `dest`, consuming these values.
     *
     * @param {Array} list the list to read from, either an arguments object or
     *     a normal array
     * @param {Object} dest the object on which to set the supported properties
     * @return {Boolean} {@true if any property was read from the source object}
     */
    static readSupported(list: any, dest?: any): boolean {
        const source = this.getSource(list)
        const that = this
        let read = false
        if (source) {
            Object.keys(source).forEach(function (key) {
                if (key in dest) {
                    const value = that.readNamed(list, key)
                    if (value !== undefined) {
                        dest[key] = value
                    }
                    read = true
                }
            })
        }
        return read
    }

    /**
     * @return the arguments object if the list provides one at `list[0]`
     */
    static getSource(list: any) {
        let source = list.__source
        if (source === undefined) {
            const arg = list.length === 1 && list[0]
            source = list.__source = arg && Base.isPlainObject(arg) ? arg : null
        }
        return source
    }

    /**
     * @return the named value if the list provides an arguments object,
     *     `null` if the named value is `null` or `undefined`, and
     *     `undefined` if there is no arguments object If no name is
     *     provided, it returns the whole arguments object
     */
    static getNamed(list: any, name?: string) {
        const source = this.getSource(list)
        if (source) {
            // Return the whole arguments object if no name is provided.
            return name ? source[name] : list.__filtered || source
        }
    }

    /**
     * Checks if the argument list has a named argument with the given name. If
     * name is `null`, it returns `true` if there are any named arguments.
     */
    static hasNamed(list: any, name: any) {
        return !!this.getNamed(list, name)
    }

    static isPlainValue(obj: any, asString?: boolean): boolean {
        return (
            Base.isPlainObject(obj) ||
            Array.isArray(obj) ||
            (asString && typeof obj === 'string')
        )
    }

    static push(list: any[], items: any[]) {
        const itemsLength = items.length
        if (itemsLength < 4096) {
            list.push(...items)
        } else {
            const startLength = list.length
            list.length += itemsLength
            for (let i = 0; i < itemsLength; i++) {
                list[startLength + i] = items[i]
            }
        }
        return list
    }

    static splice<T extends Base>(
        list: T[],
        items: T[],
        index?: number,
        remove?: number
    ) {
        const amount = items && items.length
        const append = index === undefined
        index = append ? list.length : index
        if (index > list.length) index = list.length
        for (let i = 0; i < amount; i++) items[i]._index = index + i
        if (append) {
            Base.push(list, items)
            return []
        } else {
            const args = [index, remove]
            if (items) Base.push(args, items)
            const removed = list.splice(index, remove, ...(items || []))

            for (let i = 0, l = removed.length; i < l; i++)
                removed[i]._index = undefined

            for (let i = index + amount, l = list.length; i < l; i++)
                list[i]._index = i
            return removed
        }
    }

    /**
     * Capitalizes the passed string: hello world -> Hello World
     */
    static capitalize(str: string) {
        return str.replace(/\b[a-z]/g, function (match) {
            return match.toUpperCase()
        })
    }

    /**
     * Camelizes the passed hyphenated string: caps-lock -> capsLock
     */
    static camelize(str: string) {
        return str.replace(/-(.)/g, function (_, chr) {
            return chr.toUpperCase()
        })
    }

    /**
     * Converts camelized strings to hyphenated ones: CapsLock -> caps-lock
     */
    static hyphenate(str: string) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
    }

    static construct(classname: string, ...args: any[]): any {
        if (Base.exports[classname]) {
            return new Base.exports[classname](...args)
        }
    }
}
