import logo from './logo.svg'
import './App.css'
import { Gradient, Point } from '@yomyer/paperts'

function App() {
    const gradient = new Gradient()
    console.log(gradient.toJSON())

    const point = new Point()
    console.log(point)
    return (
        <div className='App'>
            <header className='App-header'>
                <img src={logo} className='App-logo' alt='logo' />
                <p>
                    Edit <code>src/App.js</code> and save to reload.
                </p>
                <a
                    className='App-link'
                    href='https://reactjs.org'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    Learn React
                </a>
            </header>
        </div>
    )
}

export default App
