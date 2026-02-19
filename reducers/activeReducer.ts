import {createSlice} from "@reduxjs/toolkit"
import {useSelector, useDispatch} from "react-redux"
import type {StoreState, StoreDispatch} from "../store"

const activeSlice = createSlice({
    name: "active",
    initialState: {
        hover: true
    },
    reducers: {
        setHover: (state, action) => {state.hover = action.payload}
    }    
})

const {
    setHover
} = activeSlice.actions

export const useActiveSelector = () => {
    const selector = useSelector.withTypes<StoreState>()
    return {
        hover: selector((state) => state.active.hover)
    }
}

export const useActiveActions = () => {
    const dispatch = useDispatch.withTypes<StoreDispatch>()()
    return {
        setHover: (state: boolean) => dispatch(setHover(state))
    }
}

export default activeSlice.reducer