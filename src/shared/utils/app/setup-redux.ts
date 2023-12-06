import { PayloadAction, configureStore, createSlice } from "@reduxjs/toolkit";
import { IsoDataOptionalSite } from "../../../shared/interfaces";
import { GetSiteResponse } from "lemmy-js-client";

interface isoDataState {
  value?: IsoDataOptionalSite;
}

const initialState: isoDataState = {
  value: undefined,
};

export const isoDataSlice = createSlice({
  name: "isoData",
  initialState,
  reducers: {
    updateIsoData: (state, action: PayloadAction<IsoDataOptionalSite>) => {
      state.value = action.payload;
    },
    updateSite: (state, action: PayloadAction<GetSiteResponse>) => {
      state.value!.site_res = action.payload;
    },
  },
});

export const { updateIsoData, updateSite } = isoDataSlice.actions;

export default function setupRedux(isoData: IsoDataOptionalSite) {
  const store = configureStore({ reducer: isoDataSlice.reducer });
  store.dispatch(updateIsoData(isoData));

  return store;
}
