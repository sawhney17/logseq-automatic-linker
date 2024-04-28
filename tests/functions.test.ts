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
      "[[Page]] before\n`page inside inline code`\n[[page]] between\n`another page inline`\n[[page]] after"
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
      ["page", "link", "Logseq"],
      `This page has a link: [page link will not be touched](http://a.com)
      [another page](http://b.com) also with a link
      [\\[This\\] is a Logseq page](https://logseq.com)`,
      false,
      false
    );
    expect(content).toBe(
      `This [[page]] has a [[link]]: [page link will not be touched](http://a.com)
      [another page](http://b.com) also with a [[link]]
      [\\[This\\] is a Logseq page](https://logseq.com)`
    );
    expect(update).toBe(true);
  });

  it("should preserve custom query scripts", () => {
    const customQueries = [
      `#+BEGIN_QUERY
    {
      :title [:h2 "In Progress"]
      :query [
        :find (pull ?b [*])
        :where
          [?b :block/uuid]
          [?b :block/marker ?marker]
           [(contains? #{"NOW", "DOING", "IN PROGRESS", "IN-PROGRESS"} ?marker)]
      ]
      :result-transform (
        fn [result] ( sort-by ( 
          fn [item] ( get item :block/priority "Z" )
        )
        result)
      )
      :remove-block-children? false
      :group-by-page? false
      :breadcrumb-show? false
      :collapsed? false
    }
    #+END_QUERY`,
      `#+BEGIN_QUERY
    {
      :title [:h2 "TO DO"]
      :query [
        :find (pull ?b [*])
        :where
          [?b :block/uuid]
          [?b :block/marker ?marker]
           [(contains? #{"TO DO", "LATER"} ?marker)]
      ]
      :result-transform (
        fn [result] ( sort-by ( 
          fn [item] ( get item :block/priority "Z" )
        )
        result)
      )
      :remove-block-children? false
      :group-by-page? false
      :breadcrumb-show? false
      :collapsed? false
    }
    #+END_QUERY`,
    ];

    const [content, update] = replaceContentWithPageLinks(
      ["In Progress", "find", "link"],
      `${customQueries[0]}
      
      Ths sentence contains a link
      
      ${customQueries[1]}`,
      false,
      false
    );

    expect(content).toEqual(
      `${customQueries[0]}
      
      Ths sentence contains a [[link]]
      
      ${customQueries[1]}`
    );
    expect(update).toBe(true);
  });

  it.each([
    {
      input: "NOW [#A] A started todo",
      expected: "NOW [#A] A started [[todo]]",
    },
    {
      input: "LATER [#B] A todo for later",
      expected: "LATER [#B] A [[todo]] for [[Later]]",
    },
    {
      input: "DOING [#A] Fix the todo marker issue",
      expected: "DOING [#A] Fix the [[todo]] marker issue",
    },
    { input: "DONE A done todo", expected: "DONE A [[Done]] [[todo]]" },
    {
      input: "CANCELED A canceled todo",
      expected: "CANCELED A [[Canceled]] [[todo]]",
    },
    {
      input: "CANCELLED A cancelled todo",
      expected: "CANCELLED A [[Cancelled]] [[todo]]",
    },
    {
      input: "IN-PROGRESS An in progress To Do",
      expected: "IN-PROGRESS An [[In Progress]] [[To Do]]",
    },
    { input: "TODO A todo", expected: "TODO A [[todo]]" },
    {
      input: "WAIT [#C] A todo waiting to be unblocked",
      expected: "WAIT [#C] A [[todo]] [[Waiting]] to be unblocked",
    },
    {
      input: "WAITING A waiting todo",
      expected: "WAITING A [[Waiting]] [[todo]]",
    },
  ])("should preserve the to do marker for $input", ({ input, expected }) => {
    let [content, update] = replaceContentWithPageLinks(
      [
        "Now",
        "Later",
        "Doing",
        "Done",
        "Canceled",
        "Cancelled",
        "In Progress",
        "In-Progress",
        "To Do",
        "todo",
        "Wait",
        "Waiting",
      ],
      input,
      false,
      false
    );
    expect(content).toBe(expected);
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

  it("should keep the original input case for lowercase pages", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["when", "for pages", "because", "links", "logseq"],
      `When creating links, the original case that was typed should be preserved
      for PAGES that only have lowercase words.
      Because logSEQ LINKS are case-insensitive anyway.`,
      false,
      false
    );
    expect(content).toBe(
      `[[When]] creating [[links]], the original case that was typed should be preserved
      [[for PAGES]] that only have lowercase words.
      [[Because]] [[logSEQ]] [[LINKS]] are case-insensitive anyway.`
    );
    expect(update).toBe(true);
  });

  it("should disregard the input case and use the page case for uppercase, title case and mixed case pages", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["John Doe", "Mary Doe", "ANYWAY", "Logseq", "But"],
      `When creating links, the page case should be used when it's not lowercase.
      So things like names are properly capitalised even when typed in lowercase: john doe, mary doe.
      logseq LINKS are case-insensitive anyway.
      but LOGSEQ will keep the case of pages that are uppercase or title case when displaying,
      even if you type them in lowercase`,
      false,
      false
    );
    expect(content).toBe(
      `When creating links, the page case should be used when it's not lowercase.
      So things like names are properly capitalised even when typed in lowercase: [[John Doe]], [[Mary Doe]].
      [[Logseq]] LINKS are case-insensitive [[ANYWAY]].
      [[But]] [[Logseq]] will keep the case of pages that are uppercase or title case when displaying,
      even if you type them in lowercase`
    );
    expect(update).toBe(true);
  });

  it("should detect Unicode links", () => {
    let [content, update] = replaceContentWithPageLinks(
      ["가나다"],
      `This block implicitly contains unicode words like 가나다.`,
      false,
      false
    );
    expect(content).toBe(
      `This block implicitly contains unicode words like [[가나다]].`
    );
  });
});
