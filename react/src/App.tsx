import './App.css'

import { PaperScope, Point, PointText } from '@yomyer/paperts'
import { useEffect, useRef } from 'react'

function App() {
    const canvasRef1 = useRef<HTMLCanvasElement>(null)

    // const a = new Path.Circle([50, 50], 40)

    useEffect(() => {
        if (canvasRef1.current) {
            const scope = new PaperScope()
            scope.setup(canvasRef1.current)

            var start = Date.now()
            var text = new PointText(new Point(200, 50))
            text.justification = 'center'
            text.fillColor = 'black'
            text.content = 'The contents of the point text'
            console.log('Load JSON', Date.now() - start)
        }
    }, [])

    return (
        <div className='App'>
            <h1>Canvas</h1>
            <canvas ref={canvasRef1} width='600' height='600'></canvas>
        </div>
    )
}

export default App
