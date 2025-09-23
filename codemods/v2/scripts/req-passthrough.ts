import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

async function transform(root: SgRoot<TSX>): Promise<string> {
  let rootNode = root.root();

  let edits: any[] = [];

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

  arrowFunctions.forEach((arr) => {
    let prms = arr.getMatch("PARAMS");
    let paramsText = prms?.text() ?? "";
    let params = paramsText.substring(1, paramsText.length - 1);
    let paramsArray = params.split(",") as string[];
    if (paramsArray.length) {
      let reqName = paramsArray[0];
      reqName = reqName ?? "";
      reqName = reqName.split(":")[0];
      const memberExpression = arr.findAll({
        rule: {
          kind: "member_expression",
          pattern: "$REQ.passthrough",
        },
      });

      if (memberExpression.length) {
        if (hasMswImport) {
          const importMatch = hasMswImport.getMatch("IMPORTS");
          let importText = importMatch?.text() ?? "";
          if (
            importText[0] == "{" &&
            importText[importText.length - 1] == "}"
          ) {
            importText =
              importText.substring(0, importText.length - 1) + ", passthrough}";
          } else {
            importText += "{passthrough}";
          }
          edits.push(hasMswImport.replace(`import ${importText} from "msw"`));
        } else {
          newImports = `import { passthrough } from "msw"; \n`;
        }
      }

      memberExpression.forEach((ex) => {
        let req = ex.getMatch("REQ");
        let reqText = req?.text() ?? "";
        if (reqText != reqName) return;
        let exText = ex?.text() ?? "";
        exText = exText.replace(`${reqText}.`, "");
        edits.push(ex.replace(exText));
      });
    }
  });

  let newSource = rootNode.text();
  if (edits.length) {
    newSource = rootNode.commitEdits(edits);
    newSource = `${newImports}${newSource}`;
  }
  return newSource;
}

export default transform;
