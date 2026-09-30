import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { resolvesToSetupWorker } from "../utils/bindings.ts";
import type { Node } from "../utils/imports.ts";
import { count } from "../utils/metrics.ts";

/**
 * `worker.stop()` now returns a Promise that must be awaited.
 * Awaits `stop()` when the receiver's definition is `setupWorker()`,
 * including a binding imported from another file, and makes the enclosing
 * function `async` if it can be.
 */
const FUNCTION_KINDS = new Set<string>([
	"arrow_function",
	"function_declaration",
	"function_expression",
	"generator_function",
	"generator_function_declaration",
	"method_definition",
]);

function getEnclosingFunction(node: Node): Node | null {
	return node.ancestors().find((ancestor) => FUNCTION_KINDS.has(ancestor.kind())) ?? null;
}

function isAsync(functionNode: Node): boolean {
	return functionNode.children().some((child) => child.kind() === "async");
}

function skipReason(functionNode: Node): string | null {
	const children = functionNode.children();

	if (children.some((child) => child.kind() === "*")) {
		return "generator";
	}

	if (children.some((child) => child.kind() === "get" || child.kind() === "set")) {
		return "accessor";
	}

	const nameNode = functionNode.field("name");

	if (functionNode.kind() === "method_definition" && nameNode?.text() === "constructor") {
		return "constructor";
	}

	return null;
}

function getAsyncEdit(functionNode: Node): Edit | null {
	if (skipReason(functionNode)) {
		return null;
	}

	const children = functionNode.children();
	const nameNode = functionNode.field("name");
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

async function transform(root: SgRoot<TSX>): Promise<string | null> {
	const rootNode = root.root();
	const edits: Array<Edit> = [];
	const asyncFunctionStarts = new Set<number>();

	const stopStatements = rootNode.findAll({
		rule: {
			kind: "expression_statement",
			has: {
				kind: "call_expression",
				pattern: "$RECEIVER.stop()",
				nthChild: 1,
			},
		},
	});

	for (const statement of stopStatements) {
		const receiver = statement.getMatch("RECEIVER");
		const stopCall = statement.child(0);

		if (!receiver || !stopCall || receiver.kind() !== "identifier") {
			continue;
		}

		if (!resolvesToSetupWorker(receiver)) {
			continue;
		}

		const enclosingFunction = getEnclosingFunction(statement);

		if (enclosingFunction && !isAsync(enclosingFunction)) {
			const functionStart = enclosingFunction.range().start.index;

			if (!asyncFunctionStarts.has(functionStart)) {
				const asyncEdit = getAsyncEdit(enclosingFunction);

				if (!asyncEdit) {
					count({
						transform: "worker-stop",
						outcome: "skipped",
						reason: skipReason(enclosingFunction) ?? "unresolved",
					});
					continue;
				}

				asyncFunctionStarts.add(functionStart);
				edits.push(asyncEdit);
				count({
					transform: "worker-stop",
					outcome: "async-added",
					reason: "sync-function",
				});
			}
		}

		edits.push({
			startPos: stopCall.range().start.index,
			endPos: stopCall.range().start.index,
			insertedText: "await ",
		});
		count({
			transform: "worker-stop",
			outcome: "awaited",
			reason: "discarded-promise",
		});
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

export default transform;
