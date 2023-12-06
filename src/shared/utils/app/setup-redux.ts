import { configureStore, createSlice } from "@reduxjs/toolkit";
import { IsoDataOptionalSite } from "../../../shared/interfaces";

// TODO add reducer function here
export default function setupRedux(isoData?: IsoDataOptionalSite) {
  const slice = createSlice({
    name: "isoData",
    initialState: { value: isoData },
    reducers: {},
  });
  const store = configureStore({ reducer: slice.reducer });
  return store;
}
