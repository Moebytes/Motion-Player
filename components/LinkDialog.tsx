import React, {useEffect, useState, useRef} from "react"
import searchIcon from "../assets/icons/search-icon.png"
import "./styles/linkdialog.less"

const LinkDialog: React.FunctionComponent = (props) => {
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)
    const searchBox = useRef(null) as React.RefObject<HTMLInputElement>

    useEffect(() => {
        const showLinkDialog = (event: any) => {
            setVisible((prev) => !prev)
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "link") setVisible(false)
        }
        const triggerPaste = () => {
            const text = window.clipboard.readText()
            if (text) {
                searchBox.current!.value += text
            }
        }
        window.ipcRenderer.on("show-link-dialog", showLinkDialog)
        window.ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        window.ipcRenderer.on("trigger-paste", triggerPaste)
        return () => {
            window.ipcRenderer.removeListener("show-link-dialog", showLinkDialog)
            window.ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
            window.ipcRenderer.removeListener("trigger-paste", triggerPaste)
        }
    }, [])

    useEffect(() => {
        const enterPressed = () => {
            if (visible) link()
        }
        const escapePressed = () => {
            if (visible) setVisible(false)
        }
        window.ipcRenderer.on("enter-pressed", enterPressed)
        window.ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
            window.ipcRenderer.removeListener("enter-pressed", enterPressed)
            window.ipcRenderer.removeListener("escape-pressed", escapePressed)
        }
    })

    const close = () => {
        setTimeout(() => {
            if (!hover) setVisible(false)
        }, 100)
    }

    const link = async () => {
        const text = searchBox.current!.value
        searchBox.current!.value = ""
        if (text) {
            const status = await fetch(text).then((r) => r.status)
            if (status !== 404) window.ipcRenderer.invoke("open-link", text)
        }
        setVisible(false)
    }

    if (visible) {
        return (
            <section className="link-dialog" onMouseDown={close}>
                <div className="link-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                    <div className="link-container">
                        <form className="link-search-bar">
                            <input type="text" className="link-search-box" ref={searchBox} placeholder="Youtube or video link..." spellCheck="false"/>
                            <button onClick={(event) => {event.preventDefault(); link()}} className="link-search-button"><img src={searchIcon} width="20" height="20" className="link-search-icon"/></button>
                        </form>
                    </div>
                </div>
            </section>
        )
    }
    return null
}

export default LinkDialog