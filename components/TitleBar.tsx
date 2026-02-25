import React, {useState} from "react"
import {useActiveSelector, useActiveActions, useThemeSelector, useThemeActions,
usePlaybackSelector, usePlaybackActions} from "../store"
import CircleIcon from "../assets/svg/circle.svg"
import CircleCloseIcon from "../assets/svg/circle-close.svg"
import CircleMinimizeIcon from "../assets/svg/circle-minimize.svg"
import CircleMaximizeIcon from "../assets/svg/circle-maximize.svg"
import CloseIcon from "../assets/svg/close.svg"
import MinimizeIcon from "../assets/svg/minimize.svg"
import MaximizeIcon from "../assets/svg/maximize.svg"
import Icon from "../assets/svg/icon.svg"
import UploadIcon from "../assets/svg/upload.svg"
import DownloadIcon from "../assets/svg/download.svg"
import SearchIcon from "../assets/svg/search.svg"
import FXIcon from "../assets/svg/fx.svg"
import VideoDragIcon from "../assets/svg/vid-drag.svg"
import VideoPanIcon from "../assets/svg/vid-pan.svg"
import TransparentIcon from "../assets/svg/transparent.svg"
import PinIcon from "../assets/svg/pin.svg"
import LightIcon from "../assets/svg/light.svg"
import DarkIcon from "../assets/svg/dark.svg"
import WindowsIcon from "../assets/svg/windows.svg"
import MacIcon from "../assets/svg/mac.svg"
import "./styles/titlebar.less"

const TitleBar: React.FunctionComponent = () => {
    const {hover, videoDrag} = useActiveSelector()
    const {setVideoDrag} = useActiveActions()
    const {theme, os, transparent, pinned} = useThemeSelector()
    const {setTheme, setOS, setTransparent, setPinned} = useThemeActions()
    const {subtitles, subtitleColor} = usePlaybackSelector()
    const {setSubtitleColor} = usePlaybackActions()
    const [iconHover, setIconHover] = useState(false)

    const onMouseDown = () => {
        window.ipcRenderer.send("moveWindow")
    }

    const close = () => {
        window.ipcRenderer.invoke("close")
    }

    const minimize = async () => {
        await window.ipcRenderer.invoke("minimize")
        setIconHover(false)
    }

    const maximize = () => {
        window.ipcRenderer.invoke("maximize")
    }

    const upload = () => {
        window.ipcRenderer.invoke("upload-file", false)
    }

    const download = () => {
        window.ipcRenderer.invoke("trigger-download")
    }

    const search = () => {
        window.ipcRenderer.invoke("show-link-dialog")
    }

    const fx = () => {
        window.ipcRenderer.invoke("show-fx-dialog")
    }

    const drag = () => {
        setVideoDrag(!videoDrag)
    }

    const switchTheme = () => {
        setTheme(theme === "light" ? "dark" : "light")
    }

    const switchOSStyle = () => {
        setOS(os === "mac" ? "windows" : "mac")
    }

    const switchTransparency = () => {
        setTransparent(!transparent)
    }

    const switchPinned = () => {
        setPinned(!pinned)
    }

    const macTitleBar = () => {
        return (
            <div className="title-group-container">
                <div className="title-mac-container" onMouseEnter={() => setIconHover(true)} onMouseLeave={() => setIconHover(false)}>
                    {iconHover ? <>
                    <CircleCloseIcon className="title-mac-button" color="var(--closeButton)" onClick={close}/>
                    <CircleMinimizeIcon className="title-mac-button" color="var(--minimizeButton)" onClick={minimize}/>
                    <CircleMaximizeIcon className="title-mac-button" color="var(--maximizeButton)" onClick={maximize}/>
                    </> : <>
                    <CircleIcon className="title-mac-button" color="var(--closeButton)" onClick={close}/>
                    <CircleIcon className="title-mac-button" color="var(--minimizeButton)" onClick={minimize}/>
                    <CircleIcon className="title-mac-button" color="var(--maximizeButton)" onClick={maximize}/>
                    </>}
                </div>
                <div className="title-container">
                    <Icon className="app-icon"/>
                    <span className="title">Motion Player</span>
                </div>
                <div className="title-button-container">
                    <UploadIcon className="title-bar-button" onClick={upload}/>
                    <DownloadIcon className="title-bar-button" onClick={download}/>
                    <SearchIcon className="title-bar-button" onClick={search}/>
                    <FXIcon className="title-bar-button" onClick={fx}/>
                    {videoDrag ?
                    <VideoDragIcon className="title-bar-button" onClick={drag}/> :
                    <VideoPanIcon className="title-bar-button" onClick={drag}/>}
                    <TransparentIcon className="title-bar-button" onClick={switchTransparency}/>
                    <PinIcon className={`title-bar-button ${pinned && "title-button-active"}`} onClick={switchPinned}/>
                    {theme === "light" ?
                    <LightIcon className="title-bar-button" onClick={switchTheme}/> :
                    <DarkIcon className="title-bar-button" onClick={switchTheme}/>}
                    <MacIcon className="title-bar-button" onClick={switchOSStyle}/>

                    {subtitles ? <>
                    <input type="color" className="subtitle-color-box" onChange={(event) => setSubtitleColor(event.target.value)} value={subtitleColor}></input>
                    </> : null}
                </div>
            </div>
        )
    }

    const windowsTitleBar = () => {
        return (
            <>
            <div className="title-group-container">
                <div className="title-container">
                    <Icon className="app-icon"/>
                    <span className="title">Motion Player</span>
                </div>
                <div className="title-button-container">
                    <UploadIcon className="title-bar-button" onClick={upload}/>
                    <DownloadIcon className="title-bar-button" onClick={download}/>
                    <SearchIcon className="title-bar-button" onClick={search}/>
                    <FXIcon className="title-bar-button" onClick={fx}/>
                    {videoDrag ?
                    <VideoDragIcon className="title-bar-button" onClick={drag}/> :
                    <VideoPanIcon className="title-bar-button" onClick={drag}/>}
                    <TransparentIcon className="title-bar-button" onClick={switchTransparency}/>
                    <PinIcon className={`title-bar-button ${pinned && "title-button-active"}`} onClick={switchPinned}/>
                    {theme === "light" ?
                    <LightIcon className="title-bar-button" onClick={switchTheme}/> :
                    <DarkIcon className="title-bar-button" onClick={switchTheme}/>}
                    <WindowsIcon className="title-bar-button" onClick={switchOSStyle}/>

                    {subtitles ? <>
                    <input type="color" className="subtitle-color-box" onChange={(event) => setSubtitleColor(event.target.value)} value={subtitleColor}></input>
                    </> : null}
                </div>
            </div>
            <div className="title-group-container">
                <div className="title-win-container">
                    <MinimizeIcon className="title-win-button" color="var(--minimizeButton)" onClick={minimize}/>
                    <MaximizeIcon className="title-win-button" color="var(--maximizeButton)" onClick={maximize} style={{marginLeft: "4px"}}/>
                    <CloseIcon className="title-win-button" color="var(--closeButton)" onClick={close}/>
                </div>
            </div>
            </>
        )
    }

    return (
        <section className={hover ? "title-bar visible" : "title-bar"} onMouseDown={onMouseDown}>
                <div className="title-bar-drag-area">
                    {os === "mac" ? macTitleBar() : windowsTitleBar()}
                </div>
        </section>
    )
}

export default TitleBar