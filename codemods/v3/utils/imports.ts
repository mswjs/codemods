import type { Edit, SgNode } from "@codemod.com/jssg-types/main";
import type TSX from "codemod:ast-grep/langs/tsx";
import { getFileStyle } from "./formatting.ts";

export type Node = SgNode<TSX>;

export interface ImportSpecifierInfo {
	node: Node;
	importedName: string;
	localName: string;
	isTypeOnly: boolean;
}

export interface ImportInfo {
	node: Node;
	sourceNode: Node;
	source: string;
	quote: string;
	isTypeOnly: boolean;
	hasSemicolon: boolean;
	namedImportsNode: Node | null;
	specifiers: Array<ImportSpecifierInfo>;
}

function unquote(text: string): string {
	return text.slice(1, -1);
}

function parseSpecifier(node: Node): ImportSpecifierInfo | null {
	const nameNode = node.field("name");

	if (!nameNode) {
		return null;
	}

	const aliasNode = node.field("alias");
	const importedName = nameNode.text();
	const localName = aliasNode ? aliasNode.text() : importedName;

	return {
		node,
		importedName,
		localName,
		isTypeOnly: /^type\s/.test(node.text()),
	};
}

/**
 * Collects all `import` statements in the file whose module specifier
 * is one of the given sources. Omit `sources` to collect every import.
 */
export function getImports(root: Node, sources?: Array<string>): Array<ImportInfo> {
	const importStatements = root.findAll({
		rule: {
			kind: "import_statement",
		},
	});

	const imports: Array<ImportInfo> = [];

	for (const statement of importStatements) {
		const sourceNode = statement.field("source");

		if (!sourceNode) {
			continue;
		}

		const source = unquote(sourceNode.text());

		if (sources && !sources.includes(source)) {
			continue;
		}

		const namedImportsNode = statement.find({
			rule: {
				kind: "named_imports",
			},
		});

		const specifiers: Array<ImportSpecifierInfo> = [];

		if (namedImportsNode) {
			const specifierNodes = namedImportsNode.findAll({
				rule: {
					kind: "import_specifier",
				},
			});

			for (const specifierNode of specifierNodes) {
				const specifier = parseSpecifier(specifierNode);

				if (specifier) {
					specifiers.push(specifier);
				}
			}
		}

		imports.push({
			node: statement,
			sourceNode,
			source,
			quote: sourceNode.text().charAt(0),
			isTypeOnly: /^import\s+type\s/.test(statement.text()),
			hasSemicolon: statement.text().trimEnd().endsWith(";"),
			namedImportsNode,
			specifiers,
		});
	}

	return imports;
}

/**
 * Returns the local binding name of the given export imported from
 * any of the given modules (e.g. "graphql" imported from "msw" as "gql").
 */
export function getLocalNames(
	root: Node,
	sources: Array<string>,
	importedName: string,
): Array<string> {
	const localNames: Array<string> = [];

	for (const importInfo of getImports(root, sources)) {
		for (const specifier of importInfo.specifiers) {
			if (specifier.importedName === importedName && !specifier.isTypeOnly) {
				localNames.push(specifier.localName);
			}
		}
	}

	return localNames;
}

export interface SpecifierText {
	importedName: string;
	localName: string;
	isTypeOnly: boolean;
}

export function formatSpecifier(specifier: SpecifierText): string {
	const typePrefix = specifier.isTypeOnly ? "type " : "";
	const alias = specifier.localName === specifier.importedName ? "" : ` as ${specifier.localName}`;

	return `${typePrefix}${specifier.importedName}${alias}`;
}

export interface RenderImportOptions {
	source: string;
	quote: string;
	isTypeOnly: boolean;
	hasSemicolon: boolean;
	specifiers: Array<SpecifierText>;
}

export function renderImport(options: RenderImportOptions): string {
	const typeKeyword = options.isTypeOnly ? " type" : "";
	const specifiers = options.specifiers.map(formatSpecifier).join(", ");
	const semicolon = options.hasSemicolon ? ";" : "";

	const source = `${options.quote}${options.source}${options.quote}`;

	return `import${typeKeyword} { ${specifiers} } from ${source}${semicolon}`;
}

/**
 * Produces the edits needed to make the given named export
 * available under the given module. Reuses an existing named
 * import from that module, otherwise adds a new import statement
 * after the last import in the file.
 */
export function ensureNamedImport(root: Node, source: string, importedName: string): Array<Edit> {
	const existingImports = getImports(root, [source]);

	for (const existing of existingImports) {
		const alreadyImported = existing.specifiers.some((specifier) => {
			return specifier.importedName === importedName;
		});

		if (alreadyImported) {
			return [];
		}
	}

	const style = getFileStyle(root);
	const reusable = existingImports.find((existing) => {
		return existing.namedImportsNode !== null && !existing.isTypeOnly;
	});

	if (reusable?.namedImportsNode) {
		const specifiers: Array<SpecifierText> = [
			...reusable.specifiers,
			{ importedName, localName: importedName, isTypeOnly: false },
		];
		const specifiersText = specifiers.map(formatSpecifier).join(", ");

		return [reusable.namedImportsNode.replace(`{ ${specifiersText} }`)];
	}

	const newImport = renderImport({
		source,
		quote: style.quote,
		isTypeOnly: false,
		hasSemicolon: style.semicolon === ";",
		specifiers: [{ importedName, localName: importedName, isTypeOnly: false }],
	});

	const allImports = getImports(root);
	const lastImport = allImports[allImports.length - 1];

	if (lastImport) {
		const insertAt = lastImport.node.range().end.index;

		return [
			{
				startPos: insertAt,
				endPos: insertAt,
				insertedText: `\n${newImport}`,
			},
		];
	}

	return [
		{
			startPos: 0,
			endPos: 0,
			insertedText: `${newImport}\n\n`,
		},
	];
}

/**
 * Renames all references to the given identifier outside of import statements.
 */
export function renameReferences(root: Node, fromName: string, toName: string): Array<Edit> {
	const references = root.findAll({
		rule: {
			any: [{ kind: "identifier" }, { kind: "type_identifier" }],
			regex: `^${fromName}$`,
			not: {
				inside: {
					kind: "import_statement",
				},
			},
		},
	});

	return references.map((reference) => {
		return reference.replace(toName);
	});
}
