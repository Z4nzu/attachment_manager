// Radix portals default to document.body, outside our shadow styles.
import * as React from "react";
export const PortalContext = React.createContext(undefined);
export const usePortal = () => React.useContext(PortalContext);
