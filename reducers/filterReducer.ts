import {createSlice} from "@reduxjs/toolkit"
import {useSelector, useDispatch} from "react-redux"
import type {StoreState, StoreDispatch} from "../store"

const filterSlice = createSlice({
    name: "filter",
    initialState: {
        brightness: 100,
        contrast: 100,
        hue: 180,
        saturation: 100,
        lightness: 100,
        blur: 0,
        sharpen: 0,
        pixelate: 1
    },
    reducers: {
        setBrightness: (state, action) => {state.brightness = action.payload},
        setContrast: (state, action) => {state.contrast = action.payload},
        setHue: (state, action) => {state.hue = action.payload},
        setSaturation: (state, action) => {state.saturation = action.payload},
        setLightness: (state, action) => {state.lightness = action.payload},
        setBlur: (state, action) => {state.blur = action.payload},
        setSharpen: (state, action) => {state.sharpen = action.payload},
        setPixelate: (state, action) => {state.pixelate = action.payload}
    }    
})

const {
    setBrightness, setContrast, setHue, setSaturation, setLightness, setBlur, 
    setSharpen, setPixelate
} = filterSlice.actions

export const useFilterSelector = () => {
    const selector = useSelector.withTypes<StoreState>()
    return {
        brightness: selector((state) => state.filter.brightness),
        contrast: selector((state) => state.filter.contrast),
        hue: selector((state) => state.filter.hue),
        saturation: selector((state) => state.filter.saturation),
        lightness: selector((state) => state.filter.lightness),
        blur: selector((state) => state.filter.blur),
        sharpen: selector((state) => state.filter.sharpen),
        pixelate: selector((state) => state.filter.pixelate)
    }
}

const resetImageFilters = (dispatch: StoreDispatch) => {
    dispatch(setBrightness(100))
    dispatch(setContrast(100))
    dispatch(setHue(180))
    dispatch(setSaturation(100))
    dispatch(setLightness(100))
    dispatch(setBlur(0))
    dispatch(setSharpen(0))
    dispatch(setPixelate(1))
}

export const useFilterActions = () => {
    const dispatch = useDispatch.withTypes<StoreDispatch>()()
    return {
        setBrightness: (state: number) => dispatch(setBrightness(state)),
        setContrast: (state: number) => dispatch(setContrast(state)),
        setHue: (state: number) => dispatch(setHue(state)),
        setSaturation: (state: number) => dispatch(setSaturation(state)),
        setLightness: (state: number) => dispatch(setLightness(state)),
        setBlur: (state: number) => dispatch(setBlur(state)),
        setSharpen: (state: number) => dispatch(setSharpen(state)),
        setPixelate: (state: number) => dispatch(setPixelate(state)),
        resetImageFilters: () => resetImageFilters(dispatch)
    }
}

export default filterSlice.reducer