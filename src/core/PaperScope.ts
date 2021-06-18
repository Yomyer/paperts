export default class PaperScope {
    private _class = 'PaperScope'
    paper: PaperScope
    settings = {
        applyMatrix: true,
        insertItems: true,
        handleSize: 4,
        hitTolerance: 0
    }
    /*
    project = null,
    projects = []
    tools = []
    */

    constructor() {
        this.paper = this
    }
}
