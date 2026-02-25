import React, {useEffect, useState} from "react"
import {useFilterSelector, useFilterActions, useActiveSelector, useActiveActions} from "../store"
import BrightnessIcon from "../assets/svg/brightness.svg"
import ContrastIcon from "../assets/svg/contrast.svg"
import HueIcon from "../assets/svg/hue.svg"
import SaturationIcon from "../assets/svg/saturation.svg"
import LightnessIcon from "../assets/svg/lightness.svg"
import BlurIcon from "../assets/svg/blur.svg"
import SharpenIcon from "../assets/svg/sharpen.svg"
import PixelateIcon from "../assets/svg/pixelate.svg"
import "./styles/fxdialog.less"
import Slider from "react-slider"

const FXDialog: React.FunctionComponent = (props) => {
    const {fxDialogActive} = useActiveSelector()
    const {setFXDialogActive} = useActiveActions()
    const [hover, setHover] = useState(false)
    const {brightness, contrast, hue, saturation, lightness, blur, sharpen, pixelate} = useFilterSelector()
    const {setBrightness, setContrast, setHue, setSaturation, setLightness, setBlur, setSharpen, setPixelate} = useFilterActions()

    useEffect(() => {
        const showFXDialog = (event: any) => {
            setFXDialogActive(!fxDialogActive)
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "fx") setFXDialogActive(false)
        }
        window.ipcRenderer.on("show-fx-dialog", showFXDialog)
        window.ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            window.ipcRenderer.removeListener("show-fx-dialog", showFXDialog)
            window.ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
        }
    }, [fxDialogActive])

    useEffect(() => {
        const escapePressed = () => {
            if (fxDialogActive) setFXDialogActive(false)
        }
        window.ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
            window.ipcRenderer.removeListener("escape-pressed", escapePressed)
        }
    })

    const close = () => {
        setTimeout(() => {
            if (!hover && fxDialogActive) setFXDialogActive(false)
        }, 100)
    }

    const resetFilters = () => {
        setBrightness(100)
        setContrast(100)
        setHue(180)
        setSaturation(100)
        setLightness(100)
        setBlur(0)
        setSharpen(0)
        setPixelate(1)
    }
        return (
            <section className="fx-dialog" onMouseDown={close}>
                <div className={`fx-dropdown ${!fxDialogActive ? `hide-fx-dropdown` : ""}`} onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}
                style={{marginLeft: "260px", top: "30px"}}>
                    <div className="fx-dropdown-row">
                        <BrightnessIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Brightness</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setBrightness(value)} min={60} max={140} step={1} value={brightness}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <ContrastIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Contrast</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setContrast(value)} min={60} max={140} step={1} value={contrast}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <HueIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Hue</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setHue(value)} min={150} max={210} step={1} value={hue}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <SaturationIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Saturation</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setSaturation(value)} min={60} max={140} step={1} value={saturation}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <LightnessIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Lightness</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setLightness(value)} min={60} max={140} step={1} value={lightness}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <BlurIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Blur</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setBlur(value)} min={0} max={4} step={0.1} value={blur}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <SharpenIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Sharpen</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setSharpen(value)} min={0} max={7} step={0.1} value={sharpen}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <PixelateIcon className="fx-dropdown-img"/>
                        <span className="fx-dropdown-text">Pixelate</span>
                        <Slider className="fx-slider" trackClassName="fx-slider-track" thumbClassName="fx-slider-thumb" 
                        onChange={(value) => setPixelate(value)} min={1} max={12} step={0.1} value={pixelate}/>
                    </div>
                    <div className="fx-dropdown-row">
                        <button className="fx-button" onClick={() => resetFilters()}>Reset</button>
                    </div>
                </div>
            </section>
        )
}

export default FXDialog