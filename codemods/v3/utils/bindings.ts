import type { Node } from "./imports.ts";

const SETUP_WORKER_SOURCES = ["msw/browser"];
const SETUP_SERVER_SOURCES = ["msw/node"];
const GRAPHQL_SOURCES = ["msw", "msw/graphql", "msw/core/graphql"];

export interface ImportBinding {
	importedName: string;
	localName: string;
	source: string;
	quote: string;
}

function unquote(text: string): string {
	return text.slice(1, -1);
}

function safeDefinition(node: Node): ReturnType<Node["definition"]> {
	try {
		return node.definition();
	} catch {
		return null;
	}
}

export function safeReferences(node: Node): ReturnType<Node["references"]> {
	try {
		return node.references();
	} catch {
		return [];
	}
}

function asSpecifier(node: Node): Node | null {
	if (node.kind() === "import_specifier") {
		return node;
	}

	const parent = node.parent();

	if (parent?.kind() === "import_specifier") {
		return parent;
	}

	return null;
}

function readSpecifier(specifier: Node): ImportBinding | null {
	const nameNode = specifier.field("name");

	if (!nameNode) {
		return null;
	}

	const alias = specifier.field("alias");
	const importedName = nameNode.text();
	const statement = specifier.ancestors().find((ancestor) => ancestor.kind() === "import_statement");
	const sourceNode = statement?.field("source");

	if (!sourceNode) {
		return null;
	}

	const sourceText = sourceNode.text();

	return {
		importedName,
		localName: alias ? alias.text() : importedName,
		source: unquote(sourceText),
		quote: sourceText.charAt(0),
	};
}

/**
 * Follow a use to the binding that defines it.
 * A use of an imported name stops at the import specifier. Asking that
 * specifier for its definition continues into another project file when
 * workspace analysis can resolve the module.
 */
export function resolveDefinition(node: Node): Node | null {
	const definition = safeDefinition(node);

	if (!definition) {
		return null;
	}

	const specifier = asSpecifier(definition.node);

	if (!specifier) {
		return definition.node;
	}

	const localNode = specifier.field("alias") ?? specifier.field("name");

	if (!localNode || localNode.id() === node.id()) {
		return definition.kind === "external" ? definition.node : specifier;
	}

	const followed = safeDefinition(localNode);

	if (followed?.kind === "external") {
		return followed.node;
	}

	return specifier;
}

export function importBindingOf(node: Node): ImportBinding | null {
	const definition = safeDefinition(node);

	if (!definition) {
		return null;
	}

	const specifier = asSpecifier(definition.node);

	if (!specifier) {
		return null;
	}

	return readSpecifier(specifier);
}

function declaratorOf(node: Node): Node | null {
	const resolved = resolveDefinition(node);

	if (!resolved) {
		return null;
	}

	if (resolved.kind() === "identifier" && resolved.parent()?.kind() === "variable_declarator") {
		return resolved.parent();
	}

	if (resolved.kind() === "variable_declarator") {
		return resolved;
	}

	return null;
}

function callImports(call: Node, importedName: string, sources: Array<string>): boolean {
	const callee = call.field("function");

	if (!callee || callee.kind() !== "identifier") {
		return false;
	}

	const binding = importBindingOf(callee);

	return (
		binding !== null && binding.importedName === importedName && sources.includes(binding.source)
	);
}

export function resolvesToFactory(
	node: Node,
	importedName: string,
	sources: Array<string>,
): boolean {
	const declarator = declaratorOf(node);

	if (!declarator) {
		return false;
	}

	const value = declarator.field("value");

	if (!value || value.kind() !== "call_expression") {
		return false;
	}

	return callImports(value, importedName, sources);
}

export function resolvesToSetupWorker(node: Node): boolean {
	return resolvesToFactory(node, "setupWorker", SETUP_WORKER_SOURCES);
}

export function resolvesToServerOrWorker(node: Node): boolean {
	return (
		resolvesToFactory(node, "setupWorker", SETUP_WORKER_SOURCES) ||
		resolvesToFactory(node, "setupServer", SETUP_SERVER_SOURCES)
	);
}

export function isGraphqlBinding(node: Node): boolean {
	const binding = importBindingOf(node);

	return binding !== null && binding.importedName === "graphql" && GRAPHQL_SOURCES.includes(binding.source);
}

export function graphqlQuote(node: Node): string {
	return importBindingOf(node)?.quote ?? "'";
}

export function currentFilename(node: Node): string {
	return node.getRoot().filename();
}

export function sameFile(node: Node, filename: string): boolean {
	return node.getRoot().filename() === filename;
}
