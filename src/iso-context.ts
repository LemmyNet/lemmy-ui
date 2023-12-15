import * as React from "react";
// import { IsoData } from "./shared/interfaces";
import { RouterChildContext } from "react-router";

export const IsoContext = React.createContext<RouterChildContext>(null!);
