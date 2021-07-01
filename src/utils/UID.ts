export default class UID {
    protected static _id = 1
    protected static _pools: {}

    /**
     * Returns the next unique id.
     * @method get
     * @return {Number} the next unique id
     * @static
     **/
    static get(name?: string): string {
        if (name) {
            // Use one UID pool per given constructor
            let pool = this._pools[name]
            if (!pool) pool = this._pools[name] = { _id: 1 }
            return (pool._id++).toString()
        } else {
            // Use the global UID pool:
            return (this._id++).toString()
        }
    }
}
