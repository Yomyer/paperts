import { CssBaseline, ThemeProvider, useMediaQuery } from '@material-ui/core'
import themeConfig from './theme'
import React, { useMemo } from 'react'
import ReactDOM from 'react-dom'
import App from './App'

import './index.css'

const Theme: React.FC = () => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

    const theme = useMemo(() => themeConfig({ darkMode: prefersDarkMode }), [
        prefersDarkMode
    ])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    )
}

ReactDOM.render(<Theme />, document.getElementById('root'))
