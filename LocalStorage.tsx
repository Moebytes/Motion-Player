import React, {useEffect} from "react"
import {useThemeSelector, useThemeActions} from "./store"
import {Themes, OS} from "./reducers/themeReducer"

const lightColorList = {
	"--closeButton": "#582eff",
	"--minimizeButton": "#8139ff",
	"--maximizeButton": "#b349ff",
	"--textColor": "#ffffff",
	"--textStrokeColor": "#000000",
	"--barColor": "#ffffff",
	"--iconColor": "#983dff",
	"--navColor": "#bcacff",
	"--playerColor": "#c8baff4d",
	"--background": "#ffffff"
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
	"--background": "#000000"
}

const LocalStorage: React.FunctionComponent = () => {
    const {theme, os, transparent} = useThemeSelector()
    const {setTheme, setOS, setTransparent} = useThemeActions()

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

    return null
}

export default LocalStorage