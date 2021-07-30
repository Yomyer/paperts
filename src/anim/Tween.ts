import { Base, Item, Emitter } from '../'

export type TweenOptions = {
    easing: string | Function
    start: boolean
    duration: number
}

export class Tween extends Emitter {
    _class = 'Tween'

    object: object
    type: string
    easing: (t: number) => number
    duration: number
    running: boolean

    protected _keys: string[]
    protected _from: object
    protected _to: object
    protected _startTime: number
    protected _then: Function
    protected _parsedKeys: { [key: string]: string }

    static easings = new Base({
        linear: function (t: number) {
            return t
        },
        easeInQuad: function (t: number) {
            return t * t
        },
        easeOutQuad: function (t: number) {
            return t * (2 - t)
        },
        easeInOutQuad: function (t: number) {
            return t < 0.5 ? 2 * t * t : -1 + 2 * (2 - t) * t
        },
        easeInCubic: function (t: number) {
            return t * t * t
        },
        easeOutCubic: function (t: number) {
            return --t * t * t + 1
        },
        easeInOutCubic: function (t: number) {
            return t < 0.5
                ? 4 * t * t * t
                : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        },
        easeInQuart: function (t: number) {
            return t * t * t * t
        },
        easeOutQuart: function (t: number) {
            return 1 - --t * t * t * t
        },
        easeInOutQuart: function (t: number) {
            return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t
        },
        easeInQuint: function (t: number) {
            return t * t * t * t * t
        },
        easeOutQuint: function (t: number) {
            return 1 + --t * t * t * t * t
        },
        easeInOutQuint: function (t: number) {
            return t < 0.5
                ? 16 * t * t * t * t * t
                : 1 + 16 * --t * t * t * t * t
        }
    })

    protected _events: {
        onUpdate: {}
    }

    /**
     * Creates a new tween.
     *
     * @param {Object} object the object to tween the properties on
     * @param {Object} from the state at the start of the tweening
     * @param {Object} to the state at the end of the tweening
     * @param {Number} duration the duration of the tweening
     * @param {String|Function} [easing='linear'] the type of the easing
     *     function or the easing function
     * @param {Boolean} [start=true] whether to start tweening automatically
     */
    constructor(
        object: Item,
        from: object,
        to: object,
        duration: number,
        easing?: string | Function,
        start?: boolean
    )

    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        this._injectEvents(this._events)

        const object = args[0]
        const from = args[1]
        const to = args[2]
        const duration = args[3]
        const easing = args[4]
        const start = args[5]

        this.object = object
        const type = typeof easing
        const isFunction = type === 'function'

        this.type = isFunction
            ? type
            : type === 'string'
            ? (easing as string)
            : 'linear'
        this.easing = isFunction ? easing : Tween.easings[this.type]
        this.duration = duration
        this.running = false

        this._then = null
        this._startTime = null
        const state = from || to
        this._keys = state ? Object.keys(state) : []
        this._parsedKeys = this._parseKeys(this._keys)
        this._from = state && this._getState(from)
        this._to = state && this._getState(to)

        if (start !== false) {
            this.start()
        }

        return this
    }

    /**
     * Set a function that will be executed when the tween completes.
     * @param {Function} function the function to execute when the tween
     *     completes
     * @return {Tween}
     *
     * @example {@paperscript}
     * // Tweens chaining:
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * // Tween color from blue to red.
     * var tween = circle.tweenTo({ fillColor: 'red' }, 2000);
     * // When the first tween completes...
     * tween.then(function() {
     *     // ...tween color back to blue.
     *     circle.tweenTo({ fillColor: 'blue' }, 2000);
     * });
     */
    then(then: Function): this {
        this._then = then
        return this
    }

    /**
     * Start tweening.
     * @return {Tween}
     *
     * @example {@paperscript}
     * // Manually start tweening.
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * var tween = circle.tweenTo(
     *     { fillColor: 'red' },
     *     { duration: 2000, start: false }
     * );
     * tween.start();
     */
    start(): this {
        this._startTime = null
        this.running = true
        return this
    }

    /**
     * Stop tweening.
     * @return {Tween}
     *
     * @example {@paperscript}
     * // Stop a tween before it completes.
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * // Start tweening from blue to red for 2 seconds.
     * var tween = circle.tweenTo({ fillColor: 'red' }, 2000);
     * // After 1 second...
     * setTimeout(function(){
     *     // ...stop tweening.
     *     tween.stop();
     * }, 1000);
     */
    stop(): this {
        this.running = false
        return this
    }

    update(progress: number): this {
        if (this.running) {
            if (progress >= 1) {
                // Always finish the animation.
                progress = 1
                this.running = false
            }

            const factor = this.easing(progress)
            const keys = this._keys
            const getValue = function (value: object) {
                return typeof value === 'function'
                    ? value(factor, progress)
                    : value
            }
            for (let i = 0, l = keys && keys.length; i < l; i++) {
                const key = keys[i]
                const from = getValue(this._from[key])
                const to = getValue(this._to[key])
                const value =
                    from && to && from.__add && to.__add
                        ? to.__subtract(from).__multiply(factor).__add(from)
                        : (to - from) * factor + from
                this._setProperty(this._parsedKeys[key], value)
            }

            if (this.responds('update')) {
                this.emit(
                    'update',
                    new Base({
                        progress: progress,
                        factor: factor
                    })
                )
            }
            if (!this.running && this._then) {
                this._then(this.object)
            }
        }
        return this
    }

    /**
     * {@grouptitle Event Handlers}
     *
     * The function to be called when the tween is updated. It receives an
     * object as its sole argument, containing the current progress of the
     * tweening and the factor calculated by the easing function.
     *
     * @name Tween#onUpdate
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Display tween progression values:
     * var circle = new Path.Circle({
     *     center: view.center,
     *     radius: 40,
     *     fillColor: 'blue'
     * });
     * var tween = circle.tweenTo(
     *     { fillColor: 'red' },
     *     {
     *         duration: 2000,
     *         easing: 'easeInCubic'
     *     }
     * );
     * var progressText = new PointText(view.center + [60, -10]);
     * var factorText = new PointText(view.center + [60, 10]);
     *
     * // Install event using onUpdate() property:
     * tween.onUpdate = function(event) {
     *     progressText.content = 'progress: ' + event.progress.toFixed(2);
     * };
     *
     * // Install event using on('update') method:
     * tween.on('update', function(event) {
     *     factorText.content = 'factor: ' + event.factor.toFixed(2);
     * });
     */

    protected _handleFrame(time: number) {
        const startTime = this._startTime
        const progress = startTime ? (time - startTime) / this.duration : 0
        if (!startTime) {
            this._startTime = time
        }
        this.update(progress)
    }

    handleFrame(time: number) {
        this._handleFrame(time)
    }

    protected _getState(state: { [key: string]: any }) {
        const keys = this._keys
        const result = {}
        for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i]
            const path = this._parsedKeys[key]
            const current = this._getProperty(path)
            let value

            if (state) {
                const resolved = this._resolveValue(current, state[key])
                this._setProperty(path, resolved)
                value = this._getProperty(path)
                value = value && value.clone ? value.clone() : value
                this._setProperty(path, current)
            } else {
                value = current && current.clone ? current.clone() : current
            }
            result[key] = value
        }
        return result
    }

    protected _resolveValue(current: any, value: any) {
        if (value) {
            if (Array.isArray(value) && value.length === 2) {
                const operator = value[0]
                return operator && operator.match && operator.match(/^[+\-*/]=/)
                    ? this._calculate(current, operator[0], value[1])
                    : value
            } else if (typeof value === 'string') {
                const match = value.match(/^[+\-*/]=(.*)/)
                if (match) {
                    const parsed = JSON.parse(
                        match[1].replace(
                            /(['"])?([a-zA-Z0-9_]+)(['"])?:/g,
                            '"$2": '
                        )
                    )
                    return this._calculate(current, value[0], parsed)
                }
            }
        }
        return value
    }

    protected _calculate(left: any, operator: string, right: any) {
        const binaryOperators = {
            '+': 'add',
            '-': 'subtract',
            '*': 'multiply',
            '/': 'divide',
            '%': 'modulo',
            '==': 'equals',
            '!=': 'equals'
        }

        const handler = binaryOperators[operator]
        if (left && left[handler]) {
            const res = left[handler](right)
            return operator === '!=' ? !res : res
        }
        switch (operator) {
            case '+':
                return left + right
            case '-':
                return left - right
            case '*':
                return left * right
            case '/':
                return left / right
            case '%':
                return left % right
            case '==':
                return left === right
            case '!=':
                return left !== right
        }
    }

    protected _parseKeys(keys: string[]) {
        const parsed = {}
        for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i]
            const path = key
                .replace(/\.([^.]*)/g, '/$1')
                .replace(/\[['"]?([^'"\]]*)['"]?\]/g, '/$1')
            parsed[key] = path.split('/')
        }
        return parsed
    }

    protected _getProperty(path: string, offset?: number): object & Base {
        let obj = this.object
        for (let i = 0, l = path.length - (offset || 0); i < l && obj; i++) {
            obj = obj[path[i]]
        }
        return obj as object & Base
    }

    protected _setProperty(path: string, value: object) {
        const dest = this._getProperty(path, 1)
        if (dest) {
            dest[path[path.length - 1]] = value
        }
    }
}
