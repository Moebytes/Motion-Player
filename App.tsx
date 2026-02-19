import "bootstrap/dist/css/bootstrap.min.css"
import React from "react"
import {createRoot} from "react-dom/client"
import {Provider} from "react-redux"
import store, {useActiveActions} from "./store"
import TitleBar from "./components/TitleBar"
import VideoPlayer from "./components/VideoPlayer"
import ReverseDialog from "./components/ReverseDialog"
import ExportDialog from "./components/ExportDialog"
import LinkDialog from "./components/LinkDialog"
import FXDialog from "./components/FXDialog"
import ContextMenu from "./components/ContextMenu"
import LocalStorage from "./LocalStorage"
import "./index.less"


const App = () => {
  const {setHover} = useActiveActions()
  
  return (
    <main className="app" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <TitleBar/>
        <ContextMenu/>
        <LocalStorage/>
        <LinkDialog/>
        <FXDialog/>
        <ReverseDialog/>
        <ExportDialog/>
        <VideoPlayer/>
    </main>
  )
}

const root = createRoot(document.getElementById("root")!)
root.render(<Provider store={store}><App/></Provider>)