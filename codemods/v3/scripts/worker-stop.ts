import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { getLocalNames, type Node } from "../utils/imports.ts";

/**
 * `worker.stop()` now returns a Promise that must be awaited.
 * Awaits the `worker.stop()` statements that discard the returned Promise
 * and makes the enclosing function `async` if needed.
 *
 * The worker is recognized by being created via `setupWorker()`
 * in the same file or by being named `worker`.
 */
const DEFAULT_WORKER_NAME = "worker";

const FUNCTION_KINDS = new Set<string>([
	"arrow_function",
	"function_declaration",
	"function_expression",
	"generator_function",
	"generator_function_declaration",
	"method_definition",
]);

function getWorkerNames(rootNode: Node): Set<string> {
	const workerNames = new Set<string>([DEFAULT_WORKER_NAME]);

	for (const setupWorkerName of getLocalNames(rootNode, ["msw/browser"], "setupWorker")) {
		const declarators = rootNode.findAll({
			rule: {
				kind: "variable_declarator",
				has: {
					field: "value",
					kind: "call_expression",
					has: {
						field: "function",
						kind: "identifier",
						regex: `^${setupWorkerName}$`,
					},
				},
			},
		});

		for (const declarator of declarators) {
			const nameNode = declarator.field("name");

			if (nameNode && nameNode.kind() === "identifier") {
				workerNames.add(nameNode.text());
			}
		}
	}

	return workerNames;
}

function getEnclosingFunction(node: Node): Node | null {
	return node.ancestors().find((ancestor) => FUNCTION_KINDS.has(ancestor.kind())) ?? null;
}

function isAsync(functionNode: Node): boolean {
	return functionNode.children().some((child) => child.kind() === "async");
}

/**
 * Returns the edit that adds the `async` keyword to the function,
 * or `null` if the function cannot be made async.
 */
function getAsyncEdit(functionNode: Node): Edit | null {
	const children = functionNode.children();
	const hasGenerator = children.some((child) => child.kind() === "*");
	const hasAccessor = children.some((child) => {
		return child.kind() === "get" || child.kind() === "set";
	});

	if (hasGenerator || hasAccessor) {
		return null;
	}

	const nameNode = functionNode.field("name");
	const isConstructor =
		functionNode.kind() === "method_definition" && nameNode?.text() === "constructor";

	if (isConstructor) {
		return null;
	}

	// Insert "async" before the "function" keyword, the method name, or the arrow parameters.
	// For methods, that is after any "static" or accessibility modifiers.
	const anchor =
		functionNode.kind() === "method_definition"
			? (nameNode ?? functionNode)
			: (children.find((child) => child.kind() === "function") ?? functionNode);
	const insertAt = anchor.range().start.index;

	return {
		startPos: insertAt,
		endPos: insertAt,
		insertedText: "async ",
	};
}

async function transform(root: SgRoot<TSX>): Promise<string> {
	const rootNode = root.root();
	const edits: Array<Edit> = [];
	const asyncFunctionStarts = new Set<number>();

	for (const workerName of getWorkerNames(rootNode)) {
		const stopStatements = rootNode.findAll({
			rule: {
				kind: "expression_statement",
				has: {
					kind: "call_expression",
					pattern: `${workerName}.stop()`,
					nthChild: 1,
				},
			},
		});

		for (const statement of stopStatements) {
			const stopCall = statement.child(0);

			if (!stopCall) {
				continue;
			}

			const enclosingFunction = getEnclosingFunction(statement);

			if (enclosingFunction && !isAsync(enclosingFunction)) {
				const functionStart = enclosingFunction.range().start.index;

				if (!asyncFunctionStarts.has(functionStart)) {
					const asyncEdit = getAsyncEdit(enclosingFunction);

					if (!asyncEdit) {
						continue;
					}

					asyncFunctionStarts.add(functionStart);
					edits.push(asyncEdit);
				}
			}

			const insertAt = stopCall.range().start.index;

			edits.push({
				startPos: insertAt,
				endPos: insertAt,
				insertedText: "await ",
			});
		}
	}

	return rootNode.commitEdits(edits);
}

export default transform;
