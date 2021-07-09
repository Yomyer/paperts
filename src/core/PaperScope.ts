import BlendMode, { BlendModes } from '../canvas/BlendMode'
import CanvasProvider from '../canvas/CanvasProvider'
import Project from '../item/Project'
import __options from '../options'
import Tool from '../tool/Tool'
import UID from '../utils/UID'
import Base from './Base'
import Size from '../basic/Size'

export type OSPlatforms =
    | 'darwin'
    | 'win'
    | 'mac'
    | 'linux'
    | 'freebsd'
    | 'sunos'

export type BrowsersPlatforms =
    | 'opera'
    | 'chrome'
    | 'safari'
    | 'webkit'
    | 'firefox'
    | 'msie'
    | 'trident'
    | 'atom'
    | 'node'

export type PapperAgent = {
    opera?: boolean
    chrome?: boolean
    safari?: boolean
    webkit?: boolean
    firefox?: boolean
    msie?: boolean
    trident?: boolean
    atom?: boolean
    node?: boolean
    jsdom?: boolean
    name?: BrowsersPlatforms
    darwin?: boolean
    win?: boolean
    mac?: boolean
    linux?: boolean
    freebsd?: boolean
    sunos?: boolean
    platform?: OSPlatforms
    version?: string
    versionNumber?: number | 'jsdom'
}

export type PapperSettings = {
    applyMatrix: boolean
    insertItems: boolean
    handleSize: number
    hitTolerance: number
}

export default class PaperScope extends Base {
    public _class = 'PaperScope'
    static paper: PaperScope

    agent: PapperAgent = {}
    browser: PapperAgent
    settings: PapperSettings

    /**
     * The currently active project.
     *
     * @name PaperScope#project
     * @type Project
     */
    project: Project

    /**
     * The list of all open projects within the current Paper.js context.
     *
     * @name PaperScope#projects
     * @type Project[]
     */
    projects: Project[]

    /**
     * The list of available tools.
     *
     * @name PaperScope#tools
     * @property
     * @type Tool[]
     */
    tools: Tool[]

    /**
     * The reference to the active tool.
     *
     * @name PaperScope#tool
     * @property
     * @type Tool
     */
    tool: Tool

    version = __options.version
    support: {
        nativeDash: boolean
        nativeBlendModes: BlendModes
    }

    static _scopes: { [key: string]: PaperScope } = {}

    constructor(...args: any[]) {
        super(...args)
    }

    initialize() {
        this.paper = this

        this.settings = new Base({
            applyMatrix: true,
            insertItems: true,
            handleSize: 4,
            hitTolerance: 0
        }) as PapperSettings & Base

        this.project = null
        this.projects = []
        this.tools = []
        this._id = UID.get()

        PaperScope._scopes[this._id] = this

        const proto = PaperScope.prototype
        if (!this.support) {
            // Set up paper.support, as an object containing properties that
            // describe the support of various features.
            const ctx = CanvasProvider.getContext(1, 1) || {}
            proto.support = {
                nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx,
                nativeBlendModes: BlendMode.nativeModes
            }
            CanvasProvider.release(ctx)
        }
        if (!this.agent) {
            const user = self.navigator.userAgent.toLowerCase()
            const os = (/(darwin|win|mac|linux|freebsd|sunos)/.exec(user) ||
                [])[0]
            const platform = os === 'darwin' ? 'mac' : (os as OSPlatforms)
            const agent = (proto.agent = proto.browser =
                { platform }) as PapperAgent
            if (platform) agent[platform] = true

            user.replace(
                /(opera|chrome|safari|webkit|firefox|msie|trident|atom|node|jsdom)\/?\s*([.\d]+)(?:.*version\/([.\d]+))?(?:.*rv:v?([.\d]+))?/g,
                function (
                    _: any,
                    n: BrowsersPlatforms,
                    v1: any,
                    v2: any,
                    rv: any
                ): string {
                    if (!agent.chrome) {
                        const v =
                            n === 'opera'
                                ? v2
                                : /^(node|trident)$/.test(n)
                                ? rv
                                : v1
                        agent.version = v
                        agent.versionNumber = parseFloat(v)
                        n =
                            ({ trident: 'msie', jsdom: 'node' } as unknown)[
                                n
                            ] || n
                        agent.name = n
                        agent[n] = true
                    }
                    return null
                }
            )
            if (agent.chrome) delete agent.webkit
            if (agent.atom) delete agent.chrome
        }
    }

    get paper() {
        return PaperScope.paper
    }

    set paper(paper: PaperScope) {
        PaperScope.paper = paper
    }

    /**
     * The reference to the active project's view.
     *
     * @bean
     * @type View
     */
    getView() {
        const project = this.project
        return project && project.view
    }

    /**
     * A reference to the local scope. This is required, so `paper` will always
     * refer to the local scope, even when calling into it from another scope.
     * `paper.activate();` will have to be called in such a situation.
     *
     * @bean
     * @type PaperScript
     * @private
     */
    getPaper() {
        return this
    }

    /**
     * Injects the paper scope into any other given scope. Can be used for
     * example to inject the currently active PaperScope into the window's
     * global scope, to emulate PaperScript-style globally accessible Paper
     * classes and objects.
     *
     * <b>Please note:</b> Using this method may override native constructors
     * (e.g. Path). This may cause problems when using Paper.js in conjunction
     * with other libraries that rely on these constructors. Keep the library
     * scoped if you encounter issues caused by this.
     *
     * @example
     * paper.install(window);
     */
    install(scope: any) {
        Base.each(['project', 'view', 'tool'], (key) => {
            Base.define(scope, key, {
                configurable: true,
                get: () => {
                    return this[key]
                }
            })
        })

        for (const key in this) {
            if (!/^_/.test(key) && this[key]) {
                scope[key] = this[key]
            }
        }
    }

    /**
     * Sets up an empty project for us. If a canvas is provided, it also creates
     * a {@link View} for it, both linked to this scope.
     *
     * @param {HTMLCanvasElement|String|Size} element the HTML canvas element
     * this scope should be associated with, or an ID string by which to find
     * the element, or the size of the canvas to be created for usage in a web
     * worker.
     */
    setup(element: HTMLCanvasElement | String | Size) {
        this.paper = this
        this.project = new Project(element)
        return this
    }

    createCanvas(width: number, height: number) {
        return CanvasProvider.getCanvas(width, height)
    }

    /**
     * Activates this PaperScope, so all newly created items will be placed
     * in its active project.
     */
    activate() {
        this.paper = this
    }

    clear() {
        // Remove all projects, views and tools.
        // This also removes the installed event handlers.
        const projects = this.projects
        const tools = this.tools
        for (let i = projects.length - 1; i >= 0; i--) {
            projects[i].remove()
        }
        for (let i = tools.length - 1; i >= 0; i--) {
            tools[i].remove()
        }
    }

    remove() {
        this.clear()
        delete PaperScope._scopes[this._id]
    }

    /**
     * Set the global paper object to the current scope
     *
     * @param {PaperScope} scope
     */
    static setGlobalPaper(scope: PaperScope) {
        this.paper = scope
    }

    static get(id: string) {
        return this._scopes[id] || null
    }

    static getAttribute(el: HTMLElement, attr: string) {
        const name = attr + 'Attribute'
        return el[name](attr) || el[name]('data-paper-' + attr)
    }

    static hasAttribute(el: HTMLElement, attr: string): boolean {
        return !!PaperScope.getAttribute(el, attr)
    }
}
