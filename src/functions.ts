// Use random UUIDs instead of manually generated strings
const CODE_BLOCK_PLACEHOLDER = "71e46a9e-1150-49c3-a04b-0491ebe05922";
const INLINE_CODE_PLACEHOLDER = "164b97c2-beb7-4204-99b4-6ec2ddc93f9c";
const PROPERTY_PLACEHOLDER = "50220b1c-63f0-4f57-aa73-08c4d936a419";
const MARKDOWN_LINK_PLACEHOLDER = "53c65a4a-137d-44a8-8849-8ec6ca411942";

const parseForRegex = (s: string) => {
  //Remove regex special characters from s
  // s = s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  s = s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

  return s;
  // .replaceAll("[", "\\[")
  // .replaceAll("]", "\\]")
  // .replaceAll(")", "\\)")
  // .replaceAll("(", "\\(")
  // .replaceAll("+", "\\+")
  // .replaceAll("-", "\\-")
  // .replaceAll("{", "\\{")
  // .replaceAll("}", "\\}")
  // .replaceAll("*", "\\*")
  // .replaceAll("?", "\\?")
  // .replaceAll(".", "\\.")
  // .replaceAll("^", "\\^")
  // .replaceAll("$", "\\$")
  // .replaceAll("|", "\\|")
  // .replaceAll("\\", "\\\\")
  // .replaceAll("/", "\\/")
  // .replaceAll(" ", "\\s+");
};

export function replaceContentWithPageLinks(
  allPages: string[],
  content: string,
  parseAsTags: boolean,
  parseSingleWordAsTag: boolean
): [string, boolean] {
  // Handle content that should not be automatically linked
  let codeblockReversalTracker = [];
  let inlineCodeReversalTracker = [];
  let propertyTracker = [];
  let markdownLinkTracker = [];

  content = content.replaceAll(/```([^`]|\n)*```/gim, (match) => {
    codeblockReversalTracker.push(match);
    console.debug({ LogseqAutomaticLinker: "code block found", match });
    return CODE_BLOCK_PLACEHOLDER;
  });

  content = content.replaceAll(/(?=`)`(?!`)[^`]*(?=`)`(?!`)/g, (match) => {
    inlineCodeReversalTracker.push(match);
    console.debug({ LogseqAutomaticLinker: "inline code found", match });
    return INLINE_CODE_PLACEHOLDER;
  });

  content = content.replaceAll(/ *[^\s]+:: /g, (match) => {
    propertyTracker.push(match);
    console.debug({ LogseqAutomaticLinker: "property found", match });
    return PROPERTY_PLACEHOLDER;
  });

  // Broken Markdown links with nested pages won't be detected by this regex and have to be fixed manually.
  // Example: [[[page]] This is a broken Markdown link](http://example.com)
  content = content.replaceAll(/\[(([^\[\]]|\\\[|\\\])+)\]\(.*\)/g, (match) => {
    markdownLinkTracker.push(match);
    console.debug({ LogseqAutomaticLinker: "Markdown link found", match });
    return MARKDOWN_LINK_PLACEHOLDER;
  });

  let needsUpdate = false;
  allPages.forEach((page) => {
    const regex = new RegExp(
      `(\\w*(?<!\\[{2}[^[\\]]*)\\w*(?<!\\#)\\w*(?<!\\w+:\\/\\/\\S*))(?<=[\\s,.:;"']|^)(${parseForRegex(
        page
      )})(?![^[\\]]*\\]{2})(?=[\\s,.:;"']|$)`,
      "gi"
    );
    // console.log({LogseqAutomaticLinker: "value", value})
    const chineseRegex = new RegExp(
      `(?<!\\[)${parseForRegex(page)}(?!\\])`,
      "gm"
    );
    if (page.match(/^[\u4e00-\u9fa5]{0,}$/gm)) {
      content = content.replaceAll(
        chineseRegex,
        parseAsTags ? `#${page}` : `[[${page}]]`
      );
      needsUpdate = true;
    } else if (page.length > 0) {
      if (content.toUpperCase().includes(page.toUpperCase())) {
        content = content.replaceAll(regex, (match) => {
          const hasSpaces = /\s/g.test(match);

          // If page is lowercase, keep the original case of the input (match);
          // Otherwise, use the page case
          let whichCase = page == page.toLowerCase() ? match : page;

          if (parseAsTags || (parseSingleWordAsTag && !hasSpaces)) {
            return hasSpaces ? `#[[${whichCase}]]` : `#${whichCase}`;
          }
          return `[[${whichCase}]]`;
        });
        needsUpdate = true;
        // setTimeout(() => { inProcess = false }, 300)
      }
    }
    //if value is chinese
  });

  // Restore content that should not be automatically linked
  codeblockReversalTracker?.forEach((value, index) => {
    content = content.replace(CODE_BLOCK_PLACEHOLDER, value);
  });
  inlineCodeReversalTracker?.forEach((value, index) => {
    content = content.replace(INLINE_CODE_PLACEHOLDER, value);
  });
  propertyTracker?.forEach((value, index) => {
    content = content.replace(PROPERTY_PLACEHOLDER, value);
  });
  markdownLinkTracker?.forEach((value, index) => {
    content = content.replace(MARKDOWN_LINK_PLACEHOLDER, value);
  });

  return [content, needsUpdate];
}
