import type { Edit } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * The "connection" life-cycle event is renamed to "websocket:connection".
 * This only concerns the life-cycle events API (e.g. `server.events.on()`),
 * the `connection` event on the WebSocket link (`api.addEventListener()`) is unchanged.
 */
const EVENT_RENAMES = new Map<string, string>([["connection", "websocket:connection"]]);

async function transform(root: SgRoot<TSX>): Promise<string> {
	const rootNode = root.root();
	const edits: Array<Edit> = [];

	const eventCalls = rootNode.findAll({
		rule: {
			kind: "call_expression",
			has: {
				field: "function",
				kind: "member_expression",
				pattern: "$EMITTER.events.$METHOD",
			},
		},
	});

	for (const eventCall of eventCalls) {
		const args = eventCall.field("arguments");
		const eventName = args?.find({
			rule: {
				kind: "string",
				nthChild: 1,
			},
		});

		if (!eventName) {
			continue;
		}

		const quote = eventName.text().charAt(0);
		const renamedTo = EVENT_RENAMES.get(eventName.text().slice(1, -1));

		if (renamedTo) {
			edits.push(eventName.replace(`${quote}${renamedTo}${quote}`));
		}
	}

	return rootNode.commitEdits(edits);
}

export default transform;
