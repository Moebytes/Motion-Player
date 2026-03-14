/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Frame Player - A cute video player ❤                     *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import "bootstrap/dist/css/bootstrap.min.css"
import React, {useEffect} from "react"
import {createRoot} from "react-dom/client"
import {Provider} from "react-redux"
import store, {useActiveSelector, useActiveActions} from "./store"
import TitleBar from "./components/TitleBar"
import VideoPlayer from "./components/VideoPlayer"
import ExportDialog from "./components/ExportDialog"
import LinkDialog from "./components/LinkDialog"
import FXDialog from "./components/FXDialog"
import ContextMenu from "./components/ContextMenu"
import LocalStorage from "./LocalStorage"
import "./index.less"


const App = () => {
  const {fxDialogActive} = useActiveSelector()
  const {setHover} = useActiveActions()

  useEffect(() => {
    window.ipcRenderer.on("debug", console.log)
  }, [])
  
  return (
    <main className="app" onMouseEnter={() => setHover(true)} onMouseLeave={() => !fxDialogActive && setHover(false)}>
        <TitleBar/>
        <ContextMenu/>
        <LocalStorage/>
        <LinkDialog/>
        <FXDialog/>
        <ExportDialog/>
        <VideoPlayer/>
    </main>
  )
}

const root = createRoot(document.getElementById("root")!)
root.render(<Provider store={store}><App/></Provider>)