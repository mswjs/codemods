import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { resolveDefinition, resolvesToServerOrWorker, safeReferences } from "../utils/bindings.ts";
import { getFileStyle, getLineIndent, type FileStyle } from "../utils/formatting.ts";
import { ensureNamedImport, type Node } from "../utils/imports.ts";
import { count } from "../utils/metrics.ts";

/**
 * The `onUnhandledRequest` option is renamed to `onUnhandledFrame`.
 * The custom callback now receives a network frame instead of a request:
 *
 * onUnhandledRequest(request, print) {}
 * onUnhandledFrame({ frame, defaults }) {}
 */
const LEGACY_OPTION_NAME = "onUnhandledRequest";
const NEXT_OPTION_NAME = "onUnhandledFrame";

const PRINT_METHOD_RENAMES = new Map<string, string>([
	["warning", "warn"],
	["error", "error"],
]);

interface CallbackTransformResult {
	edits: Array<Edit>;
	usesFrameClass: boolean;
}

function getParameterName(parameter: Node): string | null {
	if (parameter.kind() === "identifier") {
		return parameter.text();
	}

	if (parameter.kind() === "required_parameter" || parameter.kind() === "optional_parameter") {
		const pattern = parameter.field("pattern");

		if (pattern && pattern.kind() === "identifier") {
			return pattern.text();
		}
	}

	return null;
}

function getParameterNames(parametersNode: Node): Array<string> | null {
	if (parametersNode.kind() !== "formal_parameters") {
		const name = getParameterName(parametersNode);

		return name === null ? null : [name];
	}

	const names: Array<string> = [];

	for (const parameter of parametersNode.children()) {
		if (!parameter.isNamed() || parameter.kind() === "comment") {
			continue;
		}

		const name = getParameterName(parameter);

		if (name === null) {
			return null;
		}

		names.push(name);
	}

	return names;
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasIdentifierReference(scope: Node, name: string, ignoredNodes: Array<Node>): boolean {
	const references = scope.findAll({
		rule: {
			kind: "identifier",
			regex: `^${escapeRegex(name)}$`,
		},
	});

	return references.some((reference) => {
		const referenceStart = reference.range().start.index;

		return !ignoredNodes.some((ignored) => {
			return (
				referenceStart >= ignored.range().start.index && referenceStart < ignored.range().end.index
			);
		});
	});
}

function transformCallback(
	rootNode: Node,
	containerNode: Node,
	callbackNode: Node,
	style: FileStyle,
): CallbackTransformResult | null {
	const parametersNode = callbackNode.field("parameters") ?? callbackNode.field("parameter");
	const bodyNode = callbackNode.field("body");

	if (!parametersNode || !bodyNode) {
		return null;
	}

	const parameterNames = getParameterNames(parametersNode);

	if (parameterNames === null) {
		return null;
	}

	const requestName = parameterNames[0] ?? null;
	const printName = parameterNames[1] ?? null;
	const bodyEdits: Array<Edit> = [];
	const renamedPrintCalls: Array<Node> = [];

	if (printName !== null) {
		const printMembers = bodyNode.findAll({
			rule: {
				kind: "member_expression",
				pattern: `${printName}.$METHOD`,
			},
		});

		for (const printMember of printMembers) {
			const method = printMember.getMatch("METHOD");
			const renamedTo = method ? PRINT_METHOD_RENAMES.get(method.text()) : undefined;

			if (renamedTo) {
				bodyEdits.push(printMember.replace(`defaults.${renamedTo}`));
				renamedPrintCalls.push(printMember);
			}
		}
	}

	const needsPrintAlias =
		printName !== null && hasIdentifierReference(bodyNode, printName, renamedPrintCalls);
	const usesRequest = requestName !== null && hasIdentifierReference(bodyNode, requestName, []);
	const usesDefaults = renamedPrintCalls.length > 0 || needsPrintAlias;

	const indent = getLineIndent(rootNode, containerNode);
	const innerIndent = `${indent}${style.indentUnit}`;
	const preludeLines: Array<string> = [];

	if (usesRequest) {
		preludeLines.push(
			`${innerIndent}if (!(frame instanceof HttpNetworkFrame)) {`,
			`${innerIndent}${style.indentUnit}return${style.semicolon}`,
			`${innerIndent}}`,
			"",
			`${innerIndent}const ${requestName} = frame.data.request${style.semicolon}`,
		);
	}

	if (needsPrintAlias) {
		preludeLines.push(
			`${innerIndent}const ${printName} = ` +
				`{ warning: defaults.warn, error: defaults.error }${style.semicolon}`,
		);
	}

	const prelude = preludeLines.join("\n");
	const bodyText = bodyEdits.length > 0 ? bodyNode.commitEdits(bodyEdits) : bodyNode.text();
	let nextBodyText: string;

	if (bodyNode.kind() === "statement_block" && prelude === "") {
		nextBodyText = bodyText;
	} else if (bodyNode.kind() === "statement_block") {
		const innerText = bodyText.slice(1, -1);
		const normalizedInnerText = innerText.startsWith("\n")
			? innerText
			: `\n${innerIndent}${innerText.trim()}\n${indent}`;

		nextBodyText = `{\n${prelude}${normalizedInnerText}}`;
	} else {
		const preludeText = prelude === "" ? "" : `${prelude}\n`;

		const returnStatement = `${innerIndent}return ${bodyText}${style.semicolon}`;

		nextBodyText = `{\n${preludeText}${returnStatement}\n${indent}}`;
	}

	const nextParameters = usesDefaults ? "({ frame, defaults })" : "({ frame })";

	return {
		edits: [parametersNode.replace(nextParameters), bodyNode.replace(nextBodyText)],
		usesFrameClass: usesRequest,
	};
}

function isCallback(node: Node): boolean {
	return node.kind() === "arrow_function" || node.kind() === "function_expression";
}

function enclosingCall(node: Node): Node | null {
	return node.ancestors().find((ancestor) => ancestor.kind() === "call_expression") ?? null;
}

function isListenOrStart(call: Node): boolean {
	const callee = call.field("function");

	if (!callee || callee.kind() !== "member_expression") {
		return false;
	}

	const property = callee.field("property");
	const object = callee.field("object");

	if (!property || !object || object.kind() !== "identifier") {
		return false;
	}

	if (property.text() !== "listen" && property.text() !== "start") {
		return false;
	}

	return resolvesToServerOrWorker(object);
}

function isMswOption(node: Node): boolean {
	const call = enclosingCall(node);

	return call !== null && isListenOrStart(call);
}

function importSpecifierOf(node: Node): Node | null {
	if (node.kind() === "import_specifier") {
		return node;
	}

	const parent = node.parent();

	if (parent?.kind() === "import_specifier") {
		return parent;
	}

	return null;
}

function isExportMention(node: Node): boolean {
	return node.kind() === "export_specifier" || node.parent()?.kind() === "export_specifier";
}

/**
 * `references()` of a function stops at the import that brings it into
 * another file. Uses in that file hang off the import's local name.
 */
function optionOnly(nameNode: Node): boolean {
	const seen = new Set<number>();
	const queue: Array<Node> = [nameNode];
	let sawUse = false;

	while (queue.length > 0) {
		const current = queue.pop();

		if (!current) {
			continue;
		}

		for (const file of safeReferences(current)) {
			for (const reference of file.nodes) {
				if (seen.has(reference.id())) {
					continue;
				}

				seen.add(reference.id());

				if (isExportMention(reference)) {
					continue;
				}

				const specifier = importSpecifierOf(reference);

				if (specifier) {
					const localName = specifier.field("alias") ?? specifier.field("name");

					if (localName) {
						queue.push(localName);
					}

					continue;
				}

				sawUse = true;

				if (!isOptionReference(reference)) {
					return false;
				}
			}
		}
	}

	return sawUse;
}

function isOptionReference(node: Node): boolean {
	const parent = node.parent();

	if (parent?.kind() === "pair" && parent.field("value")?.id() === node.id()) {
		const key = parent.field("key")?.text().replace(/^['"]|['"]$/g, "");

		if (key !== LEGACY_OPTION_NAME) {
			return false;
		}

		return isMswOption(parent);
	}

	if (node.kind() === "shorthand_property_identifier" && node.text() === LEGACY_OPTION_NAME) {
		return isMswOption(node);
	}

	return false;
}

function referencedCallback(node: Node): { callback: Node; nameNode: Node } | null {
	const resolved = resolveDefinition(node);

	if (!resolved || resolved.kind() !== "identifier") {
		return null;
	}

	const parent = resolved.parent();

	if (parent?.kind() === "function_declaration") {
		return { callback: parent, nameNode: resolved };
	}

	if (parent?.kind() === "variable_declarator") {
		const value = parent.field("value");

		if (value && isCallback(value)) {
			return { callback: value, nameNode: resolved };
		}
	}

	return null;
}

function recordShape(shape: string): void {
	count({
		transform: "unhandled-frame",
		shape,
	});
}

async function transform(root: SgRoot<TSX>): Promise<string | null> {
	const rootNode = root.root();
	const style = getFileStyle(rootNode);
	const edits: Array<Edit> = [];
	const rewrittenFunctions = new Set<number>();
	let usesFrameClass = false;

	const applyCallback = (container: Node, callback: Node): void => {
		const start = callback.range().start.index;

		if (rewrittenFunctions.has(start)) {
			return;
		}

		const result = transformCallback(rootNode, container, callback, style);

		if (!result) {
			return;
		}

		rewrittenFunctions.add(start);
		edits.push(...result.edits);
		usesFrameClass = usesFrameClass || result.usesFrameClass;
	};

	const pairs = rootNode.findAll({
		rule: {
			kind: "pair",
			has: {
				field: "key",
				regex: `^['"]?${escapeRegex(LEGACY_OPTION_NAME)}['"]?$`,
			},
		},
	});

	for (const pair of pairs) {
		if (!isMswOption(pair)) {
			continue;
		}

		const keyNode = pair.field("key");
		const valueNode = pair.field("value");

		if (!keyNode || !valueNode) {
			continue;
		}

		const quote = keyNode.kind() === "string" ? keyNode.text().charAt(0) : "";
		edits.push(keyNode.replace(`${quote}${NEXT_OPTION_NAME}${quote}`));

		if (isCallback(valueNode)) {
			applyCallback(pair, valueNode);
			recordShape("callback");
			continue;
		}

		if (valueNode.kind() === "identifier") {
			const referenced = referencedCallback(valueNode);
			const onlyOption = referenced !== null && optionOnly(referenced.nameNode);

			recordShape(onlyOption ? "callback" : "unresolved");
			continue;
		}

		recordShape("strategy");
	}

	const methods = rootNode.findAll({
		rule: {
			kind: "method_definition",
			has: {
				field: "name",
				regex: `^${escapeRegex(LEGACY_OPTION_NAME)}$`,
			},
		},
	});

	for (const method of methods) {
		if (!isMswOption(method)) {
			continue;
		}

		const nameNode = method.field("name");

		if (!nameNode) {
			continue;
		}

		edits.push(nameNode.replace(NEXT_OPTION_NAME));
		applyCallback(method, method);
		recordShape("method");
	}

	const shorthands = rootNode.findAll({
		rule: {
			kind: "shorthand_property_identifier",
			regex: `^${escapeRegex(LEGACY_OPTION_NAME)}$`,
		},
	});

	for (const shorthand of shorthands) {
		if (!isMswOption(shorthand)) {
			continue;
		}

		edits.push(shorthand.replace(`${NEXT_OPTION_NAME}: ${LEGACY_OPTION_NAME}`));
		recordShape("shorthand");
	}

	const declarations = rootNode.findAll({
		rule: {
			kind: "function_declaration",
		},
	});

	for (const declaration of declarations) {
		const nameNode = declaration.field("name");

		if (!nameNode || !optionOnly(nameNode)) {
			continue;
		}

		applyCallback(declaration, declaration);
	}

	const declarators = rootNode.findAll({
		rule: {
			kind: "variable_declarator",
		},
	});

	for (const declarator of declarators) {
		const nameNode = declarator.field("name");
		const valueNode = declarator.field("value");

		if (!nameNode || nameNode.kind() !== "identifier" || !valueNode || !isCallback(valueNode)) {
			continue;
		}

		if (!optionOnly(nameNode)) {
			continue;
		}

		applyCallback(declarator, valueNode);
	}

	if (usesFrameClass) {
		edits.push(...ensureNamedImport(rootNode, "msw/experimental", "HttpNetworkFrame"));
	}

	if (edits.length === 0) {
		return null;
	}

	return rootNode.commitEdits(edits);
}

export default transform;
