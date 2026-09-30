import type { Edit, SgNode } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { getAllImports } from "@jssg/utils/javascript/imports";
import { resolvesToFactory, safeReferences } from "../utils/bindings.ts";
import { getFileStyle, getLineIndent, indentText, type FileStyle } from "../utils/formatting.ts";
import { getImports, renderImport, type Node } from "../utils/imports.ts";
import { count } from "../utils/metrics.ts";

/**
 * The "msw/native" entrypoint is removed in favor of "@msw/react-native".
 * The new package exposes a pre-configured `network` object (the `defineNetwork()` API)
 * instead of the `setupServer()` function:
 *
 * const server = setupServer(...handlers)  ->  const server = network
 *                                              network.configure({ handlers: [...handlers] })
 * server.listen(options)                   ->  server.configure(options)
 *                                              server.enable()
 * server.close()                           ->  server.disable()
 */
const LEGACY_SOURCE = "msw/native";
const NEXT_SOURCE = "@msw/react-native";
const NETWORK_NAME = "network";

const METHOD_RENAMES = new Map<string, string>([
	["listen", "enable"],
	["close", "disable"],
]);

function getArgumentsText(callExpression: Node): string {
	const argumentsNode = callExpression.field("arguments");

	if (!argumentsNode) {
		return "";
	}

	return argumentsNode.text().slice(1, -1).trim();
}

/**
 * Renders the `network.configure({ handlers })` call for the given
 * `setupServer()` arguments, keeping the multi-line formatting if any.
 */
function renderConfigureHandlers(
	callExpression: Node,
	indent: string,
	style: FileStyle,
): string | null {
	const argumentsNode = callExpression.field("arguments");

	if (!argumentsNode) {
		return null;
	}

	const handlers = argumentsNode.children().filter((child) => {
		return child.isNamed() && child.kind() !== "comment";
	});

	if (handlers.length === 0) {
		return null;
	}

	if (!argumentsNode.text().includes("\n")) {
		const handlersText = handlers.map((handler) => handler.text()).join(", ");

		return `${NETWORK_NAME}.configure({ handlers: [${handlersText}] })`;
	}

	const unit = style.indentUnit;
	const handlersText = handlers
		.map((handler) => {
			return `${indentText(handler.text(), unit)},`;
		})
		.join("\n");

	return [
		`${NETWORK_NAME}.configure({`,
		`${indent}${unit}handlers: [`,
		indentText(handlersText, `${indent}${unit}`),
		`${indent}${unit}],`,
		`${indent}})`,
	].join("\n");
}

function getEnclosingStatement(node: Node): Node | null {
	let current: Node | null = node;

	while (current) {
		const parent: Node | null = current.parent();

		if (!parent || parent.kind() === "program" || parent.kind() === "statement_block") {
			return current;
		}

		current = parent;
	}

	return null;
}

async function transform(root: SgRoot<TSX>): Promise<string | null> {
	const rootNode = root.root();
	const filename = root.filename();
	const style = getFileStyle(rootNode);
	const semicolon = style.semicolon;
	const edits: Array<Edit> = [];
	const legacyImports = getImports(rootNode, [LEGACY_SOURCE]);
	const setupBindings = getAllImports(rootNode as SgNode<TSX, "program">, {
		type: "named",
		name: "setupServer",
		from: LEGACY_SOURCE,
	});
	const bindingByAlias = new Map(setupBindings.map((binding) => [binding.alias, binding.node]));

	for (const importInfo of legacyImports) {
		const setupServerSpecifiers = importInfo.specifiers.filter((specifier) => {
			return specifier.importedName === "setupServer" && !specifier.isTypeOnly;
		});

		if (setupServerSpecifiers.length === 0) {
			continue;
		}

		const otherSpecifiers = importInfo.specifiers.filter((specifier) => {
			return !setupServerSpecifiers.includes(specifier);
		});
		const statements: Array<string> = [
			renderImport({
				source: NEXT_SOURCE,
				quote: importInfo.quote,
				isTypeOnly: false,
				hasSemicolon: importInfo.hasSemicolon,
				specifiers: [{ importedName: NETWORK_NAME, localName: NETWORK_NAME, isTypeOnly: false }],
			}),
		];

		if (otherSpecifiers.length > 0) {
			statements.push(
				renderImport({
					source: LEGACY_SOURCE,
					quote: importInfo.quote,
					isTypeOnly: importInfo.isTypeOnly,
					hasSemicolon: importInfo.hasSemicolon,
					specifiers: otherSpecifiers,
				}),
			);
		}

		edits.push(importInfo.node.replace(statements.join("\n")));
		count({
			transform: "react-native",
			change: "import",
		});

		for (const specifier of setupServerSpecifiers) {
			const binding = bindingByAlias.get(specifier.localName);

			if (!binding) {
				continue;
			}

			for (const file of safeReferences(binding)) {
				if (file.root.filename() !== filename) {
					continue;
				}

				for (const reference of file.nodes) {
					const setupServerCall = reference.parent();

					if (
						setupServerCall?.kind() !== "call_expression" ||
						setupServerCall.field("function")?.id() !== reference.id()
					) {
						continue;
					}

					const declarator = setupServerCall.parent();

					if (declarator?.kind() !== "variable_declarator") {
						const indent = getLineIndent(rootNode, setupServerCall);
						const configureText = renderConfigureHandlers(setupServerCall, indent, style);
						const replacement = configureText
							? `(${configureText}, ${NETWORK_NAME})`
							: NETWORK_NAME;
						edits.push(setupServerCall.replace(replacement));
						count({
							transform: "react-native",
							change: "setup-server",
						});
						continue;
					}

					edits.push(setupServerCall.replace(NETWORK_NAME));
					count({
						transform: "react-native",
						change: "setup-server",
					});

					const statement = getEnclosingStatement(declarator);

					if (!statement) {
						continue;
					}

					const indent = getLineIndent(rootNode, statement);
					const configureText = renderConfigureHandlers(setupServerCall, indent, style);

					if (configureText) {
						const insertAt = statement.range().end.index;

						edits.push({
							startPos: insertAt,
							endPos: insertAt,
							insertedText: `\n${indent}${configureText}${semicolon}`,
						});
					}
				}
			}
		}
	}

	const methodCalls = rootNode.findAll({
		rule: {
			kind: "call_expression",
			has: {
				field: "function",
				kind: "member_expression",
				pattern: "$OBJECT.$METHOD",
			},
		},
	});

	for (const methodCall of methodCalls) {
		const object = methodCall.getMatch("OBJECT");
		const method = methodCall.getMatch("METHOD");
		const memberExpression = methodCall.field("function");
		const property = memberExpression?.field("property");
		const renamedTo = method ? METHOD_RENAMES.get(method.text()) : undefined;

		if (!object || !property || !renamedTo || object.kind() !== "identifier") {
			continue;
		}

		if (!resolvesToFactory(object, "setupServer", [LEGACY_SOURCE])) {
			continue;
		}

		const receiver = object.text();
		const optionsText = getArgumentsText(methodCall);

		if (property.text() !== "listen" || optionsText === "") {
			edits.push(property.replace(renamedTo));
			count({
				transform: "react-native",
				change: property.text() === "listen" ? "listen" : "close",
			});
			continue;
		}

		const configureCall = `${receiver}.configure(${optionsText})`;
		const enableCall = `${receiver}.enable()`;
		const parent = methodCall.parent();

		if (parent && parent.kind() === "expression_statement") {
			const indent = getLineIndent(rootNode, parent);
			edits.push(methodCall.replace(`${configureCall}${semicolon}\n${indent}${enableCall}`));
		} else {
			edits.push(methodCall.replace(`(${configureCall}, ${enableCall})`));
		}

		count({
			transform: "react-native",
			change: "listen",
		});
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

export default transform;
