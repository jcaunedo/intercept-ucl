import * as React from "react";

import type { AvatarFallbackProps } from "@/components/data-display/avatar";

/** The signed-in clinician, as the shell has them: their avatar for the messages they send. */
type CurrentUser = {
	name: string;
	initials: string;
	src?: string;
	tone?: AvatarFallbackProps["tone"];
};

const CurrentUserContext = React.createContext<CurrentUser | null>(null);

/** Intercept Live's shell provides its `user` here, so every thread can show the clinician's avatar on what they send. */
function CurrentUserProvider({ value, children }: { value: CurrentUser; children: React.ReactNode }) {
	return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

/** The signed-in clinician; `null` outside the shell (a thread rendered on its own). */
function useCurrentUser() {
	return React.useContext(CurrentUserContext);
}

export { CurrentUserProvider, useCurrentUser, type CurrentUser };
