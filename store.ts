import {configureStore} from "@reduxjs/toolkit"
import themeReducer, {useThemeSelector, useThemeActions} from "./reducers/themeReducer"
import filterReducer, {useFilterSelector, useFilterActions} from "./reducers/filterReducer"
import activeReducer, {useActiveSelector, useActiveActions} from "./reducers/activeReducer"
import playbackReducer, {usePlaybackSelector, usePlaybackActions} from "./reducers/playbackReducer"

const store = configureStore({
    reducer: {
        theme: themeReducer,
        filter: filterReducer,
        active: activeReducer,
        playback: playbackReducer
    },
})

export type StoreState = ReturnType<typeof store.getState>
export type StoreDispatch = typeof store.dispatch

export {
    useThemeSelector, useThemeActions,
    useFilterSelector, useFilterActions,
    useActiveSelector, useActiveActions,
    usePlaybackSelector, usePlaybackActions
}

export default store