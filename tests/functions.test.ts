import { replaceContentWithPageLinks } from "../src/functions";

describe("replaceContentWithPageLinks()", () => {
  it("should preserve code blocks", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["page"],
      "page before ```\npage within code block\n```\npage between\n```\nanother page within code block\n```\npage after",
      false,
      false
    );
    expect(content).toBe(
      "[[page]] before ```\npage within code block\n```\n[[page]] between\n```\nanother page within code block\n```\n[[page]] after"
    );
    expect(update).toBe(true);
  });

  it("should preserve inline code", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["page"],
      "Page before\n`page inside inline code`\npage between\n`another page inline`\npage after",
      false,
      false
    );
    expect(content).toBe(
      "[[page]] before\n`page inside inline code`\n[[page]] between\n`another page inline`\n[[page]] after"
    );
    expect(update).toBe(true);
  });

  it("should preserve properties", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["page", "price"],
      `Some page here with price
        price:: 123
        page:: this is a property`,
      false,
      false
    );
    expect(content).toBe(
      `Some [[page]] here with [[price]]
        price:: 123
        page:: this is a property`
    );
    expect(update).toBe(true);
  });

  it("should preserve Markdown links", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["page", "link"],
      `This page has a link: [page link will not be touched](http://a.com)
      [another page](http://b.com) also with a link`,
      false,
      false
    );
    expect(content).toBe(
      `This [[page]] has a [[link]]: [page link will not be touched](http://a.com)
      [another page](http://b.com) also with a [[link]]`
    );
    expect(update).toBe(true);
  });

  it("should output tags when parseAsTags is configured", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["page", "multiple words"],
      "This page has multiple words",
      true,
      false
    );
    expect(content).toBe("This #page has #[[multiple words]]");
    expect(update).toBe(true);
  });

  it("should output tags when parseSingleWordAsTag is configured", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["one", "multiple words"],
      "This one becomes a tag but multiple words get brackets",
      false,
      true
    );
    expect(content).toBe(
      "This #one becomes a tag but [[multiple words]] get brackets"
    );
    expect(update).toBe(true);
  });

  it("should return the same content if nothing was parsed", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["page"],
      "This text doesn't have any links to be parsed",
      false,
      false
    );
    expect(content).toBe("This text doesn't have any links to be parsed");
    expect(update).toBe(false);
  });
});
