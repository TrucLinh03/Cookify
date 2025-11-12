import { createSlice } from "@reduxjs/toolkit";
import SecureStorage from "../../../utils/secureStorage";

// Migrate old data on app load
SecureStorage.migrate();

const loadUserFromStorage = () => {
    try {
        const user = SecureStorage.getUser();
        return { user };
    } catch (error) {
        return { user: null };
    }
}

const initialState = loadUserFromStorage();

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload.user;
            SecureStorage.setUser(state.user);
        },
        updateUser: (state, action) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
                SecureStorage.setUser(state.user);
            }
        },
        logout: (state) => {
            state.user = null;
            SecureStorage.clearAll();
        }, 
    },
})

export const { setUser, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;