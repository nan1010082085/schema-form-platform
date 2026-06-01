import 'element-plus/dist/index.css'
import './styles/variables.scss'
import './styles/theme.scss'
import { createFlowChildApp } from './microapp/index.js'
import router from './router/index.js'

createFlowChildApp({ router })
