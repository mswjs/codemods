import { useMetricAtom } from "codemod:metrics";

export const mswV3 = useMetricAtom("msw-v3");

export function count(cardinality: Record<string, string>): void {
	mswV3.increment(cardinality);
}
