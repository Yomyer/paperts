import { Exportable } from '../utils/Decorators'
import View from './View'

@Exportable()
export default class CanvasView extends View {
    protected _class = 'CanvasView'

    constructor(...args: any[]) {
        super(...args)
    }
}
