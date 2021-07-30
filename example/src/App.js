import './App.css'

import { PaperScope, Group, Path } from '@yomyer/paperts'
import { useEffect, useRef } from 'react'

function App() {
    const canvasRef = useRef(null)

    // const a = new Path.Circle([50, 50], 40)

    useEffect(() => {
        const scope = new PaperScope()
        scope.setup(canvasRef.current)

        // new Path.Circle([50, 50], 40)
        // console.log(scope.Path)
    }, [])

    return (
        <div className='App'>
            <h1>Canvas</h1>
            <canvas ref={canvasRef}></canvas>
        </div>
    )
}

export default App
