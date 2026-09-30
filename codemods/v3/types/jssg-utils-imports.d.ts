import type { Edit, SgNode } from "@codemod.com/jssg-types/main";

interface ResolvedImport<T> {
	alias: string;
	node: SgNode<T>;
	isNamespace: boolean;
}

interface NamedImportOptions {
	type: "named";
	name: string;
	from: string;
}

interface AddNamedImportOptions {
	type: "named";
	specifiers: Array<{ name: string; alias?: string }>;
	from: string;
}

export function getAllImports<T>(
	program: SgNode<T, "program">,
	options: NamedImportOptions,
): Array<ResolvedImport<T>>;

export function addImport<T>(program: SgNode<T, "program">, options: AddNamedImportOptions): Edit | null;
