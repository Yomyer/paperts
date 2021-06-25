import Base, { ExportJsonOptions } from '../core/Base'
import { Change } from '../item/ChangeFlag'
import Color from './Color'
import { Color as ColorType, GradientStop as GradientStopType } from './Types'

export default class GradientStop extends Base {
    protected _class = 'GradientStop'

    protected _color: any
    protected _offset: any
    protected _owner: Base

    /**
     * Creates a GradientStop object.
     *
     * @param {Color} [color=new Color(0, 0, 0)] the color of the stop
     * @param {Number} [offset=null] the position of the stop on the gradient
     * ramp as a value between `0` and `1`; `null` or `undefined` for automatic
     * assignment.
     */
    constructor(color?: ColorType, offer?: number)
    constructor(gradientstop?: GradientStopType)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]) {
        // (color, offset)
        let color = args[0]
        let offset = args[1]
        if (typeof args[0] === 'object' && args[1] === undefined) {
            if (Array.isArray(args[0]) && typeof args[0][0] !== 'number') {
                color = args[0][0]
                offset = args[0][1]
            } else if (
                'color' in args[0] ||
                'offset' in args[0] ||
                'rampPoint' in args[0]
            ) {
                // (stop)
                color = args[0].color
                offset = args[0].offset || args[0].rampPoint || 0
            }
        }
        this.color = color
        this.offset = offset
    }

    // TODO: Do we really need to also clone the color here?
    /**
     * @return {GradientStop} a copy of the gradient-stop
     */
    clone(): GradientStop {
        return new GradientStop(this._color.clone(), this._offset)
    }

    protected _serialize(options?: ExportJsonOptions, dictionary?: any) {
        const color = this._color
        const offset = this._offset
        return Base.serialize(
            offset == null ? [color] : [color, offset],
            options,
            true,
            dictionary
        )
    }

    /**
     * Called by various setters whenever a value changes
     */
    protected _changed() {
        if (this._owner) this._owner.changed(Change.STYLE)
    }

    /**
     * The ramp-point of the gradient stop as a value between `0` and `1`.
     *
     * @bean
     * @type Number
     *
     * @example {@paperscript height=300}
     * // Animating a gradient's ramp points:
     *
     * // Create a circle shaped path at the center of the view,
     * // using 40% of the height of the view as its radius
     * // and fill it with a radial gradient color:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: view.bounds.height * 0.4
     * });
     *
     * path.fillColor = {
     *     gradient: {
     *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
     *         radial: true
     *     },
     *     origin: path.position,
     *     destination: path.bounds.rightCenter
     * };
     *
     * var gradient = path.fillColor.gradient;
     *
     * // This function is called each frame of the animation:
     * function onFrame(event) {
     *     var blackStop = gradient.stops[2];
     *     // Animate the offset between 0.7 and 0.9:
     *     blackStop.offset = Math.sin(event.time * 5) * 0.1 + 0.8;
     *
     *     // Animate the offset between 0.2 and 0.4
     *     var redStop = gradient.stops[1];
     *     redStop.offset = Math.sin(event.time * 3) * 0.1 + 0.3;
     * }
     */
    get offset() {
        return this._offset
    }

    set offset(offset: number) {
        this._offset = offset
        this._changed()
    }

    /**
     * @private
     * @deprecated use {@link #offset} instead.
     */
    private get rampPoint() {
        return this._offset
    }

    /**
     * @private
     * @deprecated use {@link #offset} instead.
     */
    private set rampPoint(offset: number) {
        this._offset = offset
        this._changed()
    }

    /**
     * The color of the gradient stop.
     *
     * @bean
     * @type Color
     *
     * @example {@paperscript height=300}
     * // Animating a gradient's ramp points:
     *
     * // Create a circle shaped path at the center of the view,
     * // using 40% of the height of the view as its radius
     * // and fill it with a radial gradient color:
     * var path = new Path.Circle({
     *     center: view.center,
     *     radius: view.bounds.height * 0.4
     * });
     *
     * path.fillColor = {
     *     gradient: {
     *         stops: [['yellow', 0.05], ['red', 0.2], ['black', 1]],
     *         radial: true
     *     },
     *     origin: path.position,
     *     destination: path.bounds.rightCenter
     * };
     *
     * var redStop = path.fillColor.gradient.stops[1];
     * var blackStop = path.fillColor.gradient.stops[2];
     *
     * // This function is called each frame of the animation:
     * function onFrame(event) {
     *     // Animate the offset between 0.7 and 0.9:
     *     blackStop.offset = Math.sin(event.time * 5) * 0.1 + 0.8;
     *
     *     // Animate the offset between 0.2 and 0.4
     *     redStop.offset = Math.sin(event.time * 3) * 0.1 + 0.3;
     * }
     */
    get color() {
        return this._color
    }

    set color(color: ColorType) {
        Color._setOwner(this._color, null)
        this._color = Color._setOwner(Color.read([color], 0), this, 'setColor')
        this._changed()
    }

    get owner() {
        return this._owner
    }

    set owner(owner: Base) {
        this._owner = owner
    }

    equals(stop: GradientStopType): boolean
    equals(stop: GradientStop): boolean {
        return (
            stop === this ||
            (stop &&
                this._class === stop._class &&
                this._color.equals(stop._color) &&
                this._offset === stop._offset) ||
            false
        )
    }
}
