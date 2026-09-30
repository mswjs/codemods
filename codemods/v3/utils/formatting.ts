import { getImports, type Node } from "./imports.ts";

export interface FileStyle {
	quote: string;
	semicolon: string;
	indentUnit: string;
}

/**
 * Returns the whitespace that indents the line on which the node starts.
 */
export function getLineIndent(root: Node, node: Node): string {
	const line = root.text().split("\n")[node.range().start.line] ?? "";
	const match = line.match(/^\s*/);

	return match ? match[0] : "";
}

function detectIndentUnit(root: Node): string {
	const block = root.find({
		rule: {
			kind: "statement_block",
			has: {
				nthChild: 2,
			},
		},
	});

	if (block) {
		const firstStatement = block.children().find((child) => {
			return child.isNamed() && child.kind() !== "comment";
		});

		if (firstStatement) {
			const blockIndent = getLineIndent(root, block);
			const statementIndent = getLineIndent(root, firstStatement);

			if (statementIndent.length > blockIndent.length) {
				return statementIndent.slice(blockIndent.length);
			}
		}
	}

	return "  ";
}

/**
 * Detects the quote style, semicolon usage, and indentation of the file.
 */
export function getFileStyle(root: Node): FileStyle {
	const indentUnit = detectIndentUnit(root);
	const firstImport = getImports(root)[0];

	if (firstImport) {
		return {
			quote: firstImport.quote,
			semicolon: firstImport.hasSemicolon ? ";" : "",
			indentUnit,
		};
	}

	const statement = root.find({
		rule: {
			any: [{ kind: "expression_statement" }, { kind: "lexical_declaration" }],
		},
	});
	const hasSemicolon = statement ? statement.text().trimEnd().endsWith(";") : true;

	return {
		quote: '"',
		semicolon: hasSemicolon ? ";" : "",
		indentUnit,
	};
}

/**
 * Prepends the given indentation to every line of the text.
 */
export function indentText(text: string, indent: string): string {
	return text
		.split("\n")
		.map((line) => {
			return line === "" ? line : `${indent}${line}`;
		})
		.join("\n");
}
