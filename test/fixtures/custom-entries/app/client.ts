import { hydrate } from "@phatjng/graft/client";

(window as { customClient?: boolean }).customClient = true;
hydrate();
