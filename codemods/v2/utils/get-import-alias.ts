import type { SgNode } from "@codemod.com/jssg-types/main";
import type TSX from "codemod:ast-grep/langs/tsx";

const getImportAlias = (
  moduleName: string,
  importName: string,
  root: SgNode<TSX, "program">
): string | null => {
  const importStmt = root.find({
    rule: {
      kind: "import_statement",
      has: {
        kind: "string",
        pattern: `"${moduleName}"`,
      },
    },
  });

  if (!importStmt) return null;

  let namedImport = importStmt.find({
    rule: {
      kind: "import_specifier",
      has: {
        kind: "identifier",
        pattern: importName,
      },
    },
  });

  let namedImportText = namedImport ? namedImport.text() : importName;
  let namedImportArray = namedImportText?.split(" ") as string[];
  let namedImportLast = namedImportArray?.[namedImportArray.length - 1] ?? "";

  return namedImportLast;
};

export default getImportAlias;
