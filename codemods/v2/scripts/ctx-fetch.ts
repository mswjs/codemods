import type { RuleConfig } from "@codemod.com/jssg-types/main";
import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import isMSWCall from "../utils/is-msw-calls.ts";

async function transform(root: SgRoot<TSX>): Promise<string> {
  let rootNode = root.root();

  let edits: any[] = [];

  let arrowFunctions = rootNode.findAll({
    rule: {
      any: [
        {
          kind: "arrow_function",
          pattern: "async $PARAMS => $BLOCK",
          inside: {
            kind: "arguments",
            inside: {
              kind: "call_expression",
              has: {
                kind: "member_expression",
                pattern: "$MEMBER",
              },
            },
          },
        },
        {
          kind: "arrow_function",
          pattern: "$PARAMS => $BLOCK",
          inside: {
            kind: "arguments",
            inside: {
              kind: "call_expression",
              has: {
                kind: "member_expression",
                pattern: "$MEMBER",
              },
            },
          },
        },
      ],
    },
  });

  let newImports = "";

  for (let arr of arrowFunctions) {
    if (
      !isMSWCall(
        arr.getMatch("MEMBER")?.text() ?? "",
        "msw",
        "http",
        rootNode
      ) &&
      !isMSWCall(
        arr.getMatch("MEMBER")?.text() ?? "",
        "msw",
        "graphql",
        rootNode
      )
    ) {
      continue;
    }
    let prms = arr.getMatch("PARAMS");
    let paramsText = prms?.text() ?? "";
    let params = paramsText.substring(1, paramsText.length - 1).split(",");
    let ctxParam = params[2];
    if (ctxParam) {
      ctxParam = ctxParam.split(":")[0];
      let fetchs = arr.findAll({
        rule: {
          kind: "call_expression",
          pattern: `${ctxParam}.fetch($PARAM)`,
        },
      });
      if (fetchs.length) {
        let hasMswImport = rootNode.find({
          rule: {
            any: [
              {
                kind: "import_statement",
                pattern: 'import $IMPORTS from "msw"',
              },
              {
                kind: "import_statement",
                pattern: "import $IMPORTS from 'msw'",
              },
            ],
          },
        });

        if (hasMswImport) {
          const importMatch = hasMswImport.getMatch("IMPORTS");
          let importText = importMatch?.text() ?? "";
          if (
            importText[0] == "{" &&
            importText[importText.length - 1] == "}"
          ) {
            importText =
              importText.substring(0, importText.length - 1) + ", bypass}";
          } else {
            importText += "{bypass}";
          }
          edits.push(hasMswImport.replace(`import ${importText} from "msw"`));
        } else {
          newImports = `import { bypass } from "msw"; \n`;
        }

        for (let f of fetchs) {
          let param = f.getMatch("PARAM")?.text() ?? "";
          let newFetch = `fetch(bypass(${param}))`;
          edits.push(f.replace(newFetch));
        }
      }
    }
  }

  let newSource = rootNode.text();
  if (edits.length) {
    newSource = rootNode.commitEdits(edits);
    newSource = `${newImports}${newSource}`;
  }

  return newSource;
}

export function getSelector(): RuleConfig<TSX> {
  return {
    rule: {
      any: [
        {
          kind: "arrow_function",
          pattern: "async $PARAMS => $BLOCK",
          inside: {
            kind: "arguments",
            inside: {
              kind: "call_expression",
              has: {
                kind: "member_expression",
                pattern: "$MEMBER",
              },
            },
          },
        },
        {
          kind: "arrow_function",
          pattern: "$PARAMS => $BLOCK",
          inside: {
            kind: "arguments",
            inside: {
              kind: "call_expression",
              has: {
                kind: "member_expression",
                pattern: "$MEMBER",
              },
            },
          },
        },
      ],
    },
  };
}

export default transform;
