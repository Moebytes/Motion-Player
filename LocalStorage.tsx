import React, {useEffect} from "react"
import {useThemeSelector, useThemeActions, useActiveSelector,
useActiveActions} from "./store"
import {Themes, OS} from "./reducers/themeReducer"

const lightColorList = {
	"--closeButton": "#582eff",
	"--minimizeButton": "#8139ff",
	"--maximizeButton": "#b349ff",
	"--textColor": "#000000",
	"--textStrokeColor": "#000000",
	"--barColor": "#ffffff",
	"--iconColor": "#983dff",
	"--navColor": "#bcacff",
	"--playerColor": "#c8baff4d",
	"--background": "#ffffff",
	"--dropdownColor": "#ab8fff"
}

const darkColorList = {
	"--closeButton": "#582eff",
	"--minimizeButton": "#8139ff",
	"--maximizeButton": "#b349ff",
	"--textColor": "#ffffff",
	"--textStrokeColor": "#000000",
	"--barColor": "#000000",
	"--iconColor": "#a04cff",
	"--navColor": "#0f0929",
	"--playerColor": "#0f09294d",
	"--background": "#000000",
	"--dropdownColor": "#231954"
}

const LocalStorage: React.FunctionComponent = () => {
    const {theme, os, transparent, pinned} = useThemeSelector()
    const {setTheme, setOS, setTransparent, setPinned} = useThemeActions()
    const {videoDrag} = useActiveSelector()
    const {setVideoDrag} = useActiveActions()

    useEffect(() => {
        if (typeof window === "undefined") return
        const colorList = theme.includes("light") ? lightColorList : darkColorList

        for (let i = 0; i < Object.keys(colorList).length; i++) {
            const key = Object.keys(colorList)[i]
            const color = Object.values(colorList)[i]
            document.documentElement.style.setProperty(key, color)
        }

        if (transparent) {
            document.documentElement.style.setProperty("--background", "transparent")
            document.documentElement.style.setProperty("--navColor", "transparent")
        }
    }, [theme, transparent])

    useEffect(() => {
        const initTheme = async () => {
            const savedTheme = await window.ipcRenderer.invoke("get-theme")
            if (savedTheme) setTheme(savedTheme as Themes)
        }
        initTheme()
    }, [])

    useEffect(() => {
        window.ipcRenderer.invoke("save-theme", theme)
    }, [theme])

    useEffect(() => {
        const initOS = async () => {
            const savedOS = await window.ipcRenderer.invoke("get-os")
            if (savedOS) setOS(savedOS as OS)
        }
        initOS()
    }, [])

    useEffect(() => {
        window.ipcRenderer.invoke("save-os", os)
    }, [os])

    useEffect(() => {
        const initOS = async () => {
            const savedTransparent = await window.ipcRenderer.invoke("get-transparent")
            if (savedTransparent) setTransparent(savedTransparent)
        }
        initOS()
    }, [])

    useEffect(() => {
        window.ipcRenderer.invoke("save-transparent", transparent)
    }, [transparent])

    useEffect(() => {
        const initPinned = async () => {
            const savedPinned = await window.ipcRenderer.invoke("get-pinned")
            if (savedPinned) setPinned(savedPinned)
        }
        initPinned()
    }, [])

    useEffect(() => {
        window.ipcRenderer.invoke("save-pinned", pinned)
    }, [pinned])

    useEffect(() => {
        const initVideoDrag = async () => {
            const savedDrag = await window.ipcRenderer.invoke("get-vid-drag")
            if (savedDrag) setVideoDrag(Boolean(savedDrag))
        }
        initVideoDrag()
    }, [])

    useEffect(() => {
        window.ipcRenderer.invoke("save-vid-drag", videoDrag)
    }, [videoDrag])

    return null
}

export default LocalStorage