import Base from './Base'
import Emitter from './Emitter'
import PaperScope from './PaperScope'

export default class PaperScopeItem extends Emitter {
    protected _scope: PaperScope
    protected _list: string
    protected _reference: string

    constructor(activate?: boolean)
    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]): this {
        this._scope = PaperScope.paper

        this._index = this._scope[this._list].push(this) - 1
        if (args[0] || !this._scope[this._reference]) this.activate()

        return this
    }

    get scope() {
        return this._scope
    }

    activate() {
        if (!this._scope) {
            return false
        }
        const prev = this._scope[this._reference]
        if (prev && prev !== this) prev.emit('deactivate')
        this._scope[this._reference] = this
        this.emit('activate', prev)
        return true
    }

    isActive() {
        return this._scope[this._reference] === this
    }

    remove() {
        if (this._index == null) return false
        Base.splice(this._scope[this._list], null, this._index, 1)

        if (this._scope[this._reference] === this)
            this._scope[this._reference] = null
        this._scope = null
        return true
    }

    getView() {
        return this._scope.getView()
    }
}
