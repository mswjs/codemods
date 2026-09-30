import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
	formatSpecifier,
	getImports,
	renameReferences,
	renderImport,
	type ImportInfo,
	type SpecifierText,
} from "../utils/imports.ts";

const ROOT_ENTRYPOINT = "msw";

/**
 * The "msw/core/*" entrypoints are now top-level entrypoints.
 */
const MODULE_RENAMES = new Map<string, string>([
	["msw/core/http", "msw/http"],
	["msw/core/graphql", "msw/graphql"],
	["msw/core/ws", "msw/ws"],
]);

/**
 * Exports renamed between v2 and v3 (keyed by the v2 name).
 */
const EXPORT_RENAMES = new Map<string, string>([
	["GraphQLLinkHandlers", "GraphQLLink"],
	["cleanUrl", "getCleanUrlString"],
]);

/**
 * The recommended entrypoints for the protocol-specific exports and the utilities of "msw".
 * Everything not listed here stays imported from the root "msw" entrypoint.
 * The order of the entrypoints is the order of the produced import statements.
 */
const ENTRYPOINT_EXPORTS = new Map<string, Array<string>>([
	[
		"msw/http",
		[
			"http",
			"HttpHandler",
			"HttpMethods",
			"HttpResponse",
			"HttpRequestHandler",
			"HttpResponseResolver",
			"RequestQuery",
			"HttpRequestParsedResult",
			"HttpHandlerInfo",
			"HttpRequestResolverExtras",
			"HttpHandlerMethod",
			"HttpCustomPredicate",
			"HttpResponseInit",
			"StrictRequest",
		],
	],
	[
		"msw/graphql",
		[
			"graphql",
			"GraphQLHandler",
			"GraphQLQuery",
			"GraphQLVariables",
			"GraphQLRequestBody",
			"GraphQLResponseBody",
			"GraphQLJsonRequestBody",
			"GraphQLOperationType",
			"GraphQLCustomPredicate",
			"GraphQLRequestHandler",
			"GraphQLOperationHandler",
			"GraphQLResponseResolver",
			"GraphQLLink",
			"ParsedGraphQLRequest",
		],
	],
	[
		"msw/ws",
		[
			"ws",
			"WebSocketHandler",
			"WebSocketConnectionEvent",
			"WebSocketLink",
			"WebSocketLinkOptions",
			"WebSocketLinkExtension",
			"WebSocketData",
			"WebSocketEventListener",
			"WebSocketHandlerOptions",
			"WebSocketHandlerEventMap",
			"WebSocketHandlerConnection",
			"WebSocketExtension",
			"WebSocketExtensionContext",
			"WebSocketExtensionMessageContext",
			"WebSocketExtensionResult",
		],
	],
	[
		"msw/sse",
		[
			"sse",
			"ServerSentEventRequestHandler",
			"ServerSentEventResolver",
			"ServerSentEventResolverExtras",
			"ServerSentEventMessage",
		],
	],
	["msw/utils/delay", ["delay", "DelayMode"]],
	["msw/utils/bypass", ["bypass", "BypassRequestInput"]],
	["msw/utils/passthrough", ["passthrough"]],
	["msw/utils/is-common-asset-request", ["isCommonAssetRequest"]],
	["msw/utils/get-clean-url-string", ["getCleanUrlString"]],
]);

const EXPORT_ENTRYPOINTS = new Map<string, string>();

for (const [entrypoint, exportNames] of ENTRYPOINT_EXPORTS) {
	for (const exportName of exportNames) {
		EXPORT_ENTRYPOINTS.set(exportName, entrypoint);
	}
}

const ENTRYPOINT_ORDER = [ROOT_ENTRYPOINT, ...ENTRYPOINT_EXPORTS.keys()];

const AFFECTED_SOURCES = [ROOT_ENTRYPOINT, ...ENTRYPOINT_EXPORTS.keys(), ...MODULE_RENAMES.keys()];

type SgRootNode = ReturnType<SgRoot<TSX>["root"]>;

interface ImportPlan {
	importInfo: ImportInfo;
	targetSource: string;
	groups: Map<string, Array<SpecifierText>>;
	hasChanges: boolean;
}

interface PendingMerge {
	importInfo: ImportInfo;
	specifiers: Array<SpecifierText>;
}

function planImport(importInfo: ImportInfo, edits: Array<Edit>, rootNode: SgRootNode): ImportPlan {
	const targetSource = MODULE_RENAMES.get(importInfo.source) ?? importInfo.source;
	const groups = new Map<string, Array<SpecifierText>>();
	let hasRenamedSpecifiers = false;

	for (const specifier of importInfo.specifiers) {
		const renamedTo = EXPORT_RENAMES.get(specifier.importedName);
		let nextSpecifier: SpecifierText = specifier;

		if (renamedTo) {
			hasRenamedSpecifiers = true;

			// A non-aliased import changes its local binding, rename the usages too.
			if (specifier.localName === specifier.importedName) {
				edits.push(...renameReferences(rootNode, specifier.localName, renamedTo));
			}

			nextSpecifier = {
				importedName: renamedTo,
				localName: specifier.localName === specifier.importedName ? renamedTo : specifier.localName,
				isTypeOnly: specifier.isTypeOnly,
			};
		}

		const entrypoint =
			targetSource === ROOT_ENTRYPOINT
				? (EXPORT_ENTRYPOINTS.get(nextSpecifier.importedName) ?? ROOT_ENTRYPOINT)
				: targetSource;
		const group = groups.get(entrypoint) ?? [];

		group.push(nextSpecifier);
		groups.set(entrypoint, group);
	}

	const isModuleRenamed = targetSource !== importInfo.source;
	const isSplit = groups.size > 1 || (groups.size === 1 && !groups.has(importInfo.source));

	return {
		importInfo,
		targetSource,
		groups,
		hasChanges: isModuleRenamed || isSplit || hasRenamedSpecifiers,
	};
}

function getStatementRemovalEdit(rootNode: SgRootNode, importInfo: ImportInfo): Edit {
	const range = importInfo.node.range();
	const sourceBytes = new TextEncoder().encode(rootNode.text());
	const endsWithNewline = sourceBytes[range.end.index] === 10;

	return {
		startPos: range.start.index,
		endPos: endsWithNewline ? range.end.index + 1 : range.end.index,
		insertedText: "",
	};
}

async function transform(root: SgRoot<TSX>): Promise<string> {
	const rootNode = root.root();
	const edits: Array<Edit> = [];

	const plans = getImports(rootNode, AFFECTED_SOURCES).map((importInfo) => {
		return planImport(importInfo, edits, rootNode);
	});

	// Imports that stay as they are can absorb the specifiers moved to their module.
	const mergeTargets = new Map<string, PendingMerge>();

	for (const plan of plans) {
		const canAbsorb =
			!plan.hasChanges &&
			plan.importInfo.namedImportsNode !== null &&
			!mergeTargets.has(plan.targetSource);

		if (canAbsorb) {
			mergeTargets.set(plan.targetSource, { importInfo: plan.importInfo, specifiers: [] });
		}
	}

	for (const plan of plans) {
		if (!plan.hasChanges) {
			continue;
		}

		const { importInfo } = plan;

		if (importInfo.specifiers.length === 0) {
			edits.push(
				importInfo.sourceNode.replace(`${importInfo.quote}${plan.targetSource}${importInfo.quote}`),
			);
			continue;
		}

		const statements: Array<string> = [];
		const orderedEntrypoints = ENTRYPOINT_ORDER.filter((entrypoint) => plan.groups.has(entrypoint));

		for (const entrypoint of orderedEntrypoints) {
			const specifiers = plan.groups.get(entrypoint) ?? [];
			const mergeTarget = mergeTargets.get(entrypoint);

			if (mergeTarget && mergeTarget.importInfo.isTypeOnly === importInfo.isTypeOnly) {
				mergeTarget.specifiers.push(...specifiers);
				continue;
			}

			statements.push(
				renderImport({
					source: entrypoint,
					quote: importInfo.quote,
					isTypeOnly: importInfo.isTypeOnly,
					hasSemicolon: importInfo.hasSemicolon,
					specifiers,
				}),
			);
		}

		if (statements.length === 0) {
			edits.push(getStatementRemovalEdit(rootNode, importInfo));
		} else {
			edits.push(importInfo.node.replace(statements.join("\n")));
		}
	}

	for (const mergeTarget of mergeTargets.values()) {
		if (mergeTarget.specifiers.length === 0 || !mergeTarget.importInfo.namedImportsNode) {
			continue;
		}

		const specifiers = [...mergeTarget.importInfo.specifiers, ...mergeTarget.specifiers];
		const specifiersText = specifiers.map(formatSpecifier).join(", ");

		edits.push(mergeTarget.importInfo.namedImportsNode.replace(`{ ${specifiersText} }`));
	}

	return rootNode.commitEdits(edits);
}

export default transform;
