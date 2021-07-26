import {
    PaperScope,
    PaperScopeItem,
    Point,
    EmitterType,
    EventList,
    ToolEvent,
    ToolEventTypes
} from '@paperts'

type ToolEventFunction = (_: ToolEvent) => void
type ToolProps = {
    onMouseDown?: (event: ToolEvent) => void
}

export class Tool extends PaperScopeItem {
    protected _class = 'Tool'
    protected _events = [
        'onMouseDown',
        'onMouseUp',
        'onMouseDrag',
        'onMouseMove',
        'onActivate',
        'onDeactivate',
        'onEditOptions',
        'onKeyDown',
        'onKeyUp'
    ]

    protected _moveCount: number
    protected _downCount: number
    protected _minDistance: number
    protected _maxDistance: number
    protected _point: Point
    protected _lastPoint: Point
    protected _downPoint: Point

    constructor(props?: ToolProps)
    constructor(...args: any[]) {
        super()
        if (this.constructor.name === this._class) {
            this.initialize(...args)
        }
    }

    initialize(...args: any[]): this {
        this._list = 'tools'
        this._reference = 'tool'

        super.initialize()

        this._moveCount = -1
        this._downCount = -1
        this.set(args[0])

        return this
    }

    get point() {
        return this._point
    }

    get lastPoint() {
        return this._lastPoint
    }

    get downPoint() {
        return this._downPoint
    }

    /**
     * Activates this tool, meaning {@link PaperScope#tool} will
     * point to it and it will be the one that receives tool events.
     *
     * @name Tool#activate
     * @function
     */
    activate(): boolean {
        return super.activate()
    }

    /**
     * Removes this tool from the {@link PaperScope#tools} list.
     *
     * @name Tool#remove
     * @function
     */
    remove(): boolean {
        return super.remove()
    }

    /**
     * The minimum distance the mouse has to drag before firing the onMouseDrag
     * event, since the last onMouseDrag event.
     *
     * @bean
     * @type Number
     */
    getMinDistance() {
        return this._minDistance
    }

    setMinDistance(minDistance: number) {
        this._minDistance = minDistance
        if (
            minDistance != null &&
            this._maxDistance != null &&
            minDistance > this._maxDistance
        ) {
            this._maxDistance = minDistance
        }
    }

    get minDistance() {
        return this.getMinDistance()
    }

    set minDistance(minDistance: number) {
        this.setMinDistance(minDistance)
    }

    /**
     * The maximum distance the mouse has to drag before firing the onMouseDrag
     * event, since the last onMouseDrag event.
     *
     * @bean
     * @type Number
     */
    getMaxDistance() {
        return this._maxDistance
    }

    setMaxDistance(maxDistance: number) {
        this._maxDistance = maxDistance
        if (
            this._minDistance != null &&
            maxDistance != null &&
            maxDistance < this._minDistance
        ) {
            this._minDistance = maxDistance
        }
    }

    get maxDistance() {
        return this.getMaxDistance()
    }

    set maxDistance(maxDistance: number) {
        this.setMaxDistance(maxDistance)
    }

    // DOCS: document Tool#fixedDistance
    /**
     * @bean
     * @type Number
     */
    getFixedDistance() {
        return this._minDistance === this._maxDistance
            ? this._minDistance
            : null
    }

    setFixedDistance(distance: number) {
        this._minDistance = this._maxDistance = distance
    }

    get fixedDistance() {
        return this.getFixedDistance()
    }

    set fixedDistance(distance: number) {
        this.setFixedDistance(distance)
    }

    /**
     * {@grouptitle Mouse Event Handlers}
     *
     * The function to be called when the mouse button is pushed down. The
     * function receives a {@link ToolEvent} object which contains information
     * about the tool event.
     *
     * @name Tool#onMouseDown
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Creating circle shaped paths where the user presses the mouse button:
     * tool.onMouseDown = function(event) {
     *     // Create a new circle shaped path with a radius of 10
     *     // at the position of the mouse (event.point):
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     * }
     */
    onMouseDown: ToolEventFunction

    /**
     * The function to be called when the mouse position changes while the mouse
     * is being dragged. The function receives a {@link ToolEvent} object which
     * contains information about the tool event.
     *
     * @name Tool#onMouseDrag
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Draw a line by adding a segment to a path on every mouse drag event:
     *
     * // Create an empty path:
     * var path = new Path({
     *     strokeColor: 'black'
     * });
     *
     * tool.onMouseDrag = function(event) {
     *     // Add a segment to the path at the position of the mouse:
     *     path.add(event.point);
     * }
     */
    onMouseDrag: ToolEventFunction

    /**
     * The function to be called the mouse moves within the project view. The
     * function receives a {@link ToolEvent} object which contains information
     * about the tool event.
     *
     * @name Tool#onMouseMove
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Moving a path to the position of the mouse:
     *
     * // Create a circle shaped path with a radius of 10 at {x: 0, y: 0}:
     * var path = new Path.Circle({
     *     center: [0, 0],
     *     radius: 10,
     *     fillColor: 'black'
     * });
     *
     * tool.onMouseMove = function(event) {
     *     // Whenever the user moves the mouse, move the path
     *     // to that position:
     *     path.position = event.point;
     * }
     */
    onMouseMove: ToolEventFunction

    /**
     * The function to be called when the mouse button is released. The function
     * receives a {@link ToolEvent} object which contains information about the
     * tool event.
     *
     * @name Tool#onMouseUp
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Creating circle shaped paths where the user releases the mouse:
     * tool.onMouseUp = function(event) {
     *     // Create a new circle shaped path with a radius of 10
     *     // at the position of the mouse (event.point):
     *     var path = new Path.Circle({
     *         center: event.point,
     *         radius: 10,
     *         fillColor: 'black'
     *     });
     * }
     */
    onMouseUp: ToolEventFunction

    /**
     * {@grouptitle Keyboard Event Handlers}
     *
     * The function to be called when the user presses a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name Tool#onKeyDown
     * @property
     * @type ?Function
     *
     * @example {@paperscript}
     * // Scaling a path whenever the user presses the space bar:
     *
     * // Create a circle shaped path:
     *     var path = new Path.Circle({
     *         center: new Point(50, 50),
     *         radius: 30,
     *         fillColor: 'red'
     *     });
     *
     * tool.onKeyDown = function(event) {
     *     if (event.key == 'space') {
     *         // Scale the path by 110%:
     *         path.scale(1.1);
     *
     *         // Prevent the key event from bubbling
     *         return false;
     *     }
     * }
     */
    onKeyDown: ToolEventFunction

    /**
     * The function to be called when the user releases a key on the keyboard.
     * The function receives a {@link KeyEvent} object which contains
     * information about the keyboard event.
     *
     * If the function returns `false`, the keyboard event will be prevented
     * from bubbling up. This can be used for example to stop the window from
     * scrolling, when you need the user to interact with arrow keys.
     *
     * @name Tool#onKeyUp
     * @property
     * @type ?Function
     *
     * @example
     * tool.onKeyUp = function(event) {
     *     if (event.key == 'space') {
     *         console.log('The spacebar was released!');
     *     }
     * }
     */
    onKeyUp: ToolEventFunction
    onActivate: ToolEventFunction
    onDeactivate: ToolEventFunction

    /**
     * Private method to handle tool-events.
     *
     * @return {@true if at least one event handler was called}.
     */
    _handleMouseEvent(
        type: ToolEventTypes,
        event: UIEvent,
        point: Point,
        mouse: any
    ): boolean {
        PaperScope.paper = this._scope

        if (mouse.drag && !this.responds(type)) type = 'mousemove'
        const move = mouse.move || mouse.drag
        const responds = this.responds(type)
        const minDistance = this.minDistance
        const maxDistance = this.maxDistance
        let called = false
        const tool = this

        function update(minDistance?: number, maxDistance?: number) {
            let pt = point
            const toolPoint = move ? tool._point : tool._downPoint || pt
            if (move) {
                if (tool._moveCount >= 0 && pt.equals(toolPoint)) {
                    return false
                }
                if (toolPoint && (minDistance != null || maxDistance != null)) {
                    const vector = pt.subtract(toolPoint)
                    const distance = vector.getLength()
                    if (distance < (minDistance || 0)) return false

                    if (maxDistance) {
                        pt = toolPoint.add(
                            vector.normalize(Math.min(distance, maxDistance))
                        )
                    }
                }
                tool._moveCount++
            }
            tool._point = pt
            tool._lastPoint = toolPoint || pt
            if (mouse.down) {
                tool._moveCount = -1
                tool._downPoint = pt
                tool._downCount++
            }
            return true
        }

        function emit() {
            if (responds) {
                called =
                    tool.emit(type, new ToolEvent(tool, type, event)) || called
            }
        }

        if (mouse.down) {
            update()
            emit()
        } else if (mouse.up) {
            update(null, maxDistance)
            emit()
        } else if (responds) {
            while (update(minDistance, maxDistance)) emit()
        }
        return called
    }

    /**
     * {@grouptitle Event Handling}
     *
     * Attach an event handler to the tool.
     *
     * @name Tool#on
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Function} function the function to be called when the event
     *     occurs, receiving a {@link ToolEvent} object as its sole argument
     * @return {Tool} this tool itself, so calls can be chained
     */
    on(type: string, func: (event?: any, ...args: any) => void): this

    /**
     * Attach one or more event handlers to the tool.
     *
     * @name Tool#on
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values mousedown, mouseup, mousedrag,
     *     mousemove, keydown, keyup}
     * @return {Tool} this tool itself, so calls can be chained
     */
    on(type: EventList): this
    on(type: EmitterType, func?: (event?: any, ...args: any) => void): this {
        return super.on(type, func)
    }

    /**
     * Detach an event handler from the tool.
     *
     * @name Tool#off
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Function} function the function to be detached
     * @return {Tool} this tool itself, so calls can be chained
     */
    off(type: string, func?: (event?: any, ...args: any) => void): this

    /**
     * Detach one or more event handlers from the tool.
     *
     * @name Tool#off
     * @function
     * @param {Object} param an object literal containing one or more of the
     *     following properties: {@values mousedown, mouseup, mousedrag,
     *     mousemove, keydown, keyup}
     * @return {Tool} this tool itself, so calls can be chained
     */
    off(type: EventList): this
    off(type: EmitterType, func?: (event?: any, ...args: any) => void): this {
        return super.off(type, func)
    }

    /**
     * Emit an event on the tool.
     *
     * @name Tool#emit
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @param {Object} event an object literal containing properties describing
     * the event
     * @return {Boolean} {@true if the event had listeners}
     */
    emit(type: string, event?: any, ...args: any[]): boolean {
        return super.emit(type, event, args)
    }

    /**
     * Check if the tool has one or more event handlers of the specified type.
     *
     * @name Tool#responds
     * @function
     * @param {String} type the event type: {@values 'mousedown', 'mouseup',
     *     'mousedrag', 'mousemove', 'keydown', 'keyup'}
     * @return {Boolean} {@true if the tool has one or more event handlers of
     * the specified type}
     */
    responds(type: string): boolean {
        return super.responds(type)
    }
}
