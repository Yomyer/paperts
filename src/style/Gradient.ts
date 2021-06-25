import Base, { ExportJsonOptions } from '../core/Base'
import { UID } from '../utils'
import Color from './Color'
import GradientStop from './GradientStop'
import { GradientStop as GradientStopType } from './Types'

export default class Gradient extends Base {
    protected _class: 'Gradient'

    protected _stops: GradientStop[]
    protected _radial: boolean
    protected _owners: Base[]

    constructor(stops?: GradientStopType[], radial?: boolean)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(stops: GradientStop[], radial: boolean) {
        // Use UID here since Gradients are exported through dictionary.add().
        this._id = UID.get()
        if (stops && Base.isPlainObject(stops)) {
            this.set(stops)
            // Erase arguments since we used the passed object instead.
            stops = radial = null
        }
        // As these values might already have been set in the _set() call above,
        // only initialize them if that hasn't happened yet.
        if (this._stops == null) {
            this.stops = stops || [
                new GradientStop('white'),
                new GradientStop('black')
            ]
        }
        if (this._radial == null) {
            // Support old string type argument and new radial boolean.
            this.radial =
                (typeof radial === 'string' && radial === 'radial') ||
                radial ||
                false
        }
    }

    protected _serialize(options?: ExportJsonOptions, dictionary?: any) {
        return dictionary.add(this, () => {
            return Base.serialize(
                [this._stops, this._radial],
                options,
                true,
                dictionary
            )
        })
    }

    /**
     * Called by various setters whenever a gradient value changes
     */
    protected _changed() {
        // Loop through the gradient-colors that use this gradient and notify
        // them, so they can notify the items they belong to.
        for (let i = 0, l = this._owners && this._owners.length; i < l; i++) {
            this._owners[i].changed()
        }
    }

    /**
     * Called by Color#setGradient()
     * This is required to pass on _changed() notifications to the _owners.
     */
    protected _addOwner(color: Color) {
        if (!this._owners) this._owners = []
        this._owners.push(color)
    }

    /**
     * Called by Color whenever this gradient stops being used.
     */
    protected _removeOwner(color: Color) {
        const index = this._owners ? this._owners.indexOf(color) : -1
        if (index !== -1) {
            this._owners.splice(index, 1)
            if (!this._owners.length) this._owners = undefined
        }
    }

    /**
     * @return {Gradient} a copy of the gradient
     */
    clone(): Gradient {
        const stops = []
        for (let i = 0, l = this._stops.length; i < l; i++) {
            stops[i] = this._stops[i].clone()
        }
        return new Gradient(stops, this._radial)
    }

    /**
     * The gradient stops on the gradient ramp.
     *
     * @bean
     * @type GradientStop[]
     */
    get stops() {
        return this._stops
    }

    set stops(stops: GradientStop[]) {
        if (stops.length < 2) {
            throw new Error(
                'Gradient stop list needs to contain at least two stops.'
            )
        }
        // If this gradient already contains stops, first remove their owner.
        let _stops = this._stops
        if (_stops) {
            for (let i = 0, l = _stops.length; i < l; i++)
                _stops[i].owner = undefined
        }
        _stops = this._stops = GradientStop.readList(stops, 0, { clone: true })
        // Now assign this gradient as the new gradients' owner.
        for (let i = 0, l = _stops.length; i < l; i++) _stops[i].owner = this
        this._changed()
    }

    /**
     * Specifies whether the gradient is radial or linear.
     *
     * @bean
     * @type Boolean
     */
    get radial(): boolean {
        return this._radial
    }

    set radial(radial: boolean) {
        this._radial = radial
        this._changed()
    }

    /**
     * Checks whether the gradient is equal to the supplied gradient.
     *
     * @param {Gradient} gradient
     * @return {Boolean} {@true if they are equal}
     */
    equals(gradient: Gradient): boolean {
        if (gradient === this) return true
        if (gradient && this._class === gradient._class) {
            const stops1 = this._stops
            const stops2 = gradient._stops
            const length = stops1.length
            if (length === stops2.length) {
                for (let i = 0; i < length; i++) {
                    if (!stops1[i].equals(stops2[i])) return false
                }
                return true
            }
        }
        return false
    }
}
