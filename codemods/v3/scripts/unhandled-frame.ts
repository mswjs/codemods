import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { getFileStyle, getLineIndent, type FileStyle } from "../utils/formatting.ts";
import { ensureNamedImport, type Node } from "../utils/imports.ts";

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

function hasIdentifierReference(scope: Node, name: string, ignoredNodes: Array<Node>): boolean {
	const references = scope.findAll({
		rule: {
			kind: "identifier",
			regex: `^${name}$`,
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

async function transform(root: SgRoot<TSX>): Promise<string> {
	const rootNode = root.root();
	const style = getFileStyle(rootNode);

	const edits: Array<Edit> = [];
	let usesFrameClass = false;

	const pairs = rootNode.findAll({
		rule: {
			kind: "pair",
			has: {
				field: "key",
				regex: `^['"]?${LEGACY_OPTION_NAME}['"]?$`,
			},
		},
	});

	for (const pair of pairs) {
		const keyNode = pair.field("key");
		const valueNode = pair.field("value");

		if (!keyNode || !valueNode) {
			continue;
		}

		const quote = keyNode.kind() === "string" ? keyNode.text().charAt(0) : "";
		edits.push(keyNode.replace(`${quote}${NEXT_OPTION_NAME}${quote}`));

		if (isCallback(valueNode)) {
			const result = transformCallback(rootNode, pair, valueNode, style);

			if (result) {
				edits.push(...result.edits);
				usesFrameClass = usesFrameClass || result.usesFrameClass;
			}
		}
	}

	const methods = rootNode.findAll({
		rule: {
			kind: "method_definition",
			has: {
				field: "name",
				regex: `^${LEGACY_OPTION_NAME}$`,
			},
		},
	});

	for (const method of methods) {
		const nameNode = method.field("name");

		if (!nameNode) {
			continue;
		}

		edits.push(nameNode.replace(NEXT_OPTION_NAME));

		const result = transformCallback(rootNode, method, method, style);

		if (result) {
			edits.push(...result.edits);
			usesFrameClass = usesFrameClass || result.usesFrameClass;
		}
	}

	const shorthands = rootNode.findAll({
		rule: {
			kind: "shorthand_property_identifier",
			regex: `^${LEGACY_OPTION_NAME}$`,
		},
	});

	for (const shorthand of shorthands) {
		edits.push(shorthand.replace(`${NEXT_OPTION_NAME}: ${LEGACY_OPTION_NAME}`));
	}

	if (usesFrameClass) {
		edits.push(...ensureNamedImport(rootNode, "msw/experimental", "HttpNetworkFrame"));
	}

	return rootNode.commitEdits(edits);
}

export default transform;
