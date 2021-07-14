import Group from './Group'
import Item from './Item'
import Project from './Project'

export default class Layer extends Group {
    protected _class = 'Layer'

    // DOCS: improve constructor code example.
    /**
     * Creates a new Layer item and places it at the end of the
     * {@link Project#layers} array. The newly created layer will be activated,
     * so all newly created items will be placed within it.
     *
     * @name Layer#initialize
     * @param {Item[]} [children] An array of items that will be added to the
     * newly created layer
     *
     * @example
     * var layer = new Layer();
     */
    constructor(children: Item[])

    /**
     * Creates a new Layer item and places it at the end of the
     * {@link Project#layers} array. The newly created layer will be activated,
     * so all newly created items will be placed within it.
     *
     * @name Layer#initialize
     * @param {Object} object an object containing the properties to be set on
     *     the layer
     *
     * @example {@paperscript}
     * var path = new Path([100, 100], [100, 200]);
     * var path2 = new Path([50, 150], [150, 150]);
     *
     * // Create a layer. The properties in the object literal
     * // are set on the newly created layer.
     * var layer = new Layer({
     *     children: [path, path2],
     *     strokeColor: 'black',
     *     position: view.center
     * });
     */
    constructor(object?: object)

    constructor(...args: any[]) {
        super(...args)
    }

    initialize(...args: any[]): this {
        super.initialize(...args)

        return this
    }

    /**
     * Private helper to return the owner, either the parent, or the project
     * for top-level layers, if they are inserted in it.
     */
    protected _getOwner(): Project {
        return (this._parent ||
            (this._index != null && this._project)) as Project
    }

    isInserted() {
        return this._parent ? super.isInserted() : this._index != null
    }

    /**
     * Activates the layer.
     *
     * @example
     * var firstLayer = project.activeLayer;
     * var secondLayer = new Layer();
     * console.log(project.activeLayer == secondLayer); // true
     * firstLayer.activate();
     * console.log(project.activeLayer == firstLayer); // true
     */
    activate() {
        this._project.activeLayer = this
    }
}
