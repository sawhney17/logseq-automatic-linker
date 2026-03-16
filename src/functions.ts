const CODE_BLOCK_PLACEHOLDER = "71e46a9e-1150-49c3-a04b-0491ebe05922";
const INLINE_CODE_PLACEHOLDER = "164b97c2-beb7-4204-99b4-6ec2ddc93f9c";
const PROPERTY_PLACEHOLDER = "50220b1c-63f0-4f57-aa73-08c4d936a419";
const MARKDOWN_LINK_PLACEHOLDER = "53c65a4a-137d-44a8-8849-8ec6ca411942";
const MARKER_PLACEHOLDERS: Record<string, string> = {
  NOW: "2f112da4-9248-4e2d-84d5-d9488291799f",
  LATER: "be8228a3-8d31-4592-b0a5-aa43ce1cab05",
  DOING: "36080c19-b7d7-4397-8ecf-2bcf670d0204",
  DONE: "8d03ffae-c539-48da-891a-3020a18812f1",
  CANCELED: "774f1b24-7533-4c86-93b2-ab4c2cd43b7d",
  CANCELLED: "7b6a5608-b554-489b-97a3-f9043e436903",
  "IN-PROGRESS": "842916b9-3f8e-4fd7-8490-6015a30a1dce",
  TODO: "1f5dc7a6-9479-4692-9f67-8034088395b5",
  WAIT: "d7a8bdf1-1336-4538-b35b-14459e50046e",
  WAITING: "d9c67fde-12ae-41e5-9f70-9959c172154b",
};
const CUSTOM_QUERY_PLACEHOLDER = "3cf737a1-1a29-4dd1-8db5-45effa23c810";
const LOGSEQ_LINK_PLACEHOLDER = "a1b2c3d4-e6f0-7890-abcd-ef1234567890";

const parseForRegex = (s: string) => {
  return s.replace(/[-\/\^$*+?.()|[\]{}]/g, "\$&");
};

const isChinese = (s: string) => {
  return s.length > 0 && /^[\u4e00-\u9fa5]+$/.test(s);
};

export function replaceContentWithPageLinks(
  allPages: string[],
  content: string,
  parseAsTags: boolean,
  parseSingleWordAsTag: boolean
): [string, boolean] {
  const codeblockReversalTracker: string[] = [];
  const inlineCodeReversalTracker: string[] = [];
  const propertyTracker: string[] = [];
  const markdownLinkTracker: string[] = [];
  const customQueryTracker: string[] = [];
  const logseqLinkTracker: string[] = [];

  // Protect code blocks
  content = content.replaceAll(/```[\s\S]*?```/g, (match) => {
    codeblockReversalTracker.push(match);
    return CODE_BLOCK_PLACEHOLDER;
  });

  // Protect inline code
  content = content.replaceAll(/`[^`]*`/g, (match) => {
    inlineCodeReversalTracker.push(match);
    return INLINE_CODE_PLACEHOLDER;
  });

  // Protect existing [[page links]] and #[[page tags]]
  content = content.replaceAll(/(?:#?\[\[[^\]]*\]\])/g, (match) => {
    logseqLinkTracker.push(match);
    return LOGSEQ_LINK_PLACEHOLDER;
  });

  // Protect entire property lines (key AND values)
  content = content.replaceAll(/^[^\s].*?::.*$/gm, (match) => {
    propertyTracker.push(match);
    return PROPERTY_PLACEHOLDER;
  });

  // Protect Markdown links
  content = content.replaceAll(/\[(([^\[\]]|\\[|\\])+)\]\(.*\)/g, (match) => {
    markdownLinkTracker.push(match);
    return MARKDOWN_LINK_PLACEHOLDER;
  });

  // Protect todo markers
  content = content.replaceAll(
    /^(NOW|LATER|DOING|DONE|CANCELED|CANCELLED|IN-PROGRESS|TODO|WAIT|WAITING)/gm,
    (match) => {
      return MARKER_PLACEHOLDERS[match] || match;
    }
  );

  // Protect custom queries
  content = content.replaceAll(
    /#\+BEGIN_QUERY((?!#\+END_QUERY).|\n)*#\+END_QUERY/gim,
    (match) => {
      customQueryTracker.push(match);
      return CUSTOM_QUERY_PLACEHOLDER;
    }
  );

  let needsUpdate = false;
  allPages.forEach((page) => {
    if (!page || page.length === 0) return;

    try {
      if (isChinese(page)) {
        // Chinese pages: simple check without lookbehind (avoids regex issues)
        const escaped = parseForRegex(page);
        const chineseRegex = new RegExp(escaped, "g");
        if (chineseRegex.test(content)) {
          content = content.replaceAll(
            chineseRegex,
            parseAsTags ? "#" + page : "[[" + page + "]]"
          );
          needsUpdate = true;
        }
      } else {
        if (!content.toUpperCase().includes(page.toUpperCase())) return;

        const escaped = parseForRegex(page);
        const regex = new RegExp(
          "(\w*(?<!\[{2}[^[\]]*)\w*(?<!\#)\w*(?<!\w+:\/\/\S*))(?<=[\s,.:;\"']|^)(" +
            escaped +
            ")(?![^[\]]*\]{2})(?=[\s,.:;\"']|$)",
          "gi"
        );

        content = content.replaceAll(regex, (match) => {
          const hasSpaces = /\s/g.test(match);
          let whichCase = page === page.toLowerCase() ? match : page;

          if (parseAsTags || (parseSingleWordAsTag && !hasSpaces)) {
            return hasSpaces ? "#[[" + whichCase + "]]" : "#" + whichCase;
          }
          return "[[" + whichCase + "]]";
        });
        needsUpdate = true;
      }
    } catch (e) {
      // Skip pages that produce invalid regexes
      console.debug("[AutoLinker] Skipping page with regex error:", page);
    }
  });

  // Restore in reverse order
  customQueryTracker.forEach((value) => {
    content = content.replace(CUSTOM_QUERY_PLACEHOLDER, value);
  });

  Object.entries(MARKER_PLACEHOLDERS).forEach(([marker, placeholder]) => {
    content = content.replaceAll(placeholder, marker);
  });

  markdownLinkTracker.forEach((value) => {
    content = content.replace(MARKDOWN_LINK_PLACEHOLDER, value);
  });

  propertyTracker.forEach((value) => {
    content = content.replace(PROPERTY_PLACEHOLDER, value);
  });

  logseqLinkTracker.forEach((value) => {
    content = content.replace(LOGSEQ_LINK_PLACEHOLDER, value);
  });

  inlineCodeReversalTracker.forEach((value) => {
    content = content.replace(INLINE_CODE_PLACEHOLDER, value);
  });

  codeblockReversalTracker.forEach((value) => {
    content = content.replace(CODE_BLOCK_PLACEHOLDER, value);
  });

  return [content, needsUpdate];
}
