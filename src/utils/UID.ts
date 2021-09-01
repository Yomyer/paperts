export class UID {
    protected static _id = 1
    protected static _pools = {}

    /**
     * Returns the next unique id.
     * @method get
     * @return {Number} the next unique id
     * @static
     **/
    static get(name?: string): string {
        if (name) {
            let pool = this._pools[name]
            if (!pool) pool = this._pools[name] = { _id: 1 }
            return (pool._id++).toString()
        } else {
            return (this._id++).toString()
        }
    }
}
