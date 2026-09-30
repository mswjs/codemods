import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { graphqlQuote, isGraphqlBinding } from "../utils/bindings.ts";
import { count } from "../utils/metrics.ts";

/**
 * The root-level GraphQL handlers are removed in favor of `graphql.link()`.
 */
const LINK_METHODS = new Set<string>(["query", "mutation", "operation"]);

async function transform(root: SgRoot<TSX>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Array<Edit> = [];

	const callExpressions = rootNode.findAll({
		rule: {
			kind: "call_expression",
			has: {
				field: "function",
				kind: "member_expression",
				pattern: "$OBJECT.$METHOD",
			},
		},
	});

	for (const callExpression of callExpressions) {
		const memberExpression = callExpression.field("function");
		const object = callExpression.getMatch("OBJECT");
		const method = callExpression.getMatch("METHOD");

		if (!memberExpression || !object || !method || !LINK_METHODS.has(method.text())) {
			continue;
		}

		if (object.kind() !== "identifier" || !isGraphqlBinding(object)) {
			continue;
		}

		const wildcard = `${graphqlQuote(object)}*${graphqlQuote(object)}`;

		edits.push(memberExpression.replace(`${object.text()}.link(${wildcard}).${method.text()}`));
		count({
			transform: "graphql-link",
			method: method.text(),
		});
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

export default transform;
