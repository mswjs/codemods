import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { getImports } from "../utils/imports.ts";

const GRAPHQL_SOURCES = ["msw", "msw/graphql", "msw/core/graphql"];

/**
 * The root-level GraphQL handlers are removed in favor of `graphql.link()`.
 */
const LINK_METHODS = new Set<string>(["query", "mutation", "operation"]);

async function transform(root: SgRoot<TSX>): Promise<string> {
	const rootNode = root.root();
	const edits: Array<Edit> = [];

	for (const importInfo of getImports(rootNode, GRAPHQL_SOURCES)) {
		for (const specifier of importInfo.specifiers) {
			if (specifier.importedName !== "graphql" || specifier.isTypeOnly) {
				continue;
			}

			const graphqlName = specifier.localName;
			const callExpressions = rootNode.findAll({
				rule: {
					kind: "call_expression",
					has: {
						field: "function",
						kind: "member_expression",
						pattern: `${graphqlName}.$METHOD`,
					},
				},
			});

			for (const callExpression of callExpressions) {
				const memberExpression = callExpression.field("function");
				const method = callExpression.getMatch("METHOD");

				if (!memberExpression || !method || !LINK_METHODS.has(method.text())) {
					continue;
				}

				const wildcard = `${importInfo.quote}*${importInfo.quote}`;

				edits.push(memberExpression.replace(`${graphqlName}.link(${wildcard}).${method.text()}`));
			}
		}
	}

	return rootNode.commitEdits(edits);
}

export default transform;
