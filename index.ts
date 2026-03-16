import "@logseq/libs";
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";
// @ts-ignore
import Sherlock from "sherlockjs";
import { getDateForPage } from "logseq-dateutils";
import { replaceContentWithPageLinks } from "./src/functions";

let pageList: string[] = [];
let dateFormat = "";
let isProcessing = false;

async function fetchAliases() {
  try {
    let query = `
    [:find (pull ?b [*])
               :where
               [?b :block/properties ?p]
               [(get ?p :alias)]]
    `;
    let result = await logseq.DB.datascriptQuery(query);
    let resultMap = result
      .map((item: any) => item[0]?.properties?.alias)
      .filter((alias: any) => alias && alias !== "");
    return resultMap;
  } catch (e) {
    console.error("[AutoLinker] fetchAliases error:", e);
    return [];
  }
}

async function fetchPropertyIgnoreList() {
  try {
    let query = `
    [:find (pull ?b [*])
               :where
               [?b :block/properties ?p]
               [(get ?p :automatic-ignore)]]
    `;
    let result = await logseq.DB.datascriptQuery(query);
    return result
      .filter(
        (item: any) =>
          item[0]?.["original-name"] && item[0]?.properties?.["automatic-ignore"]
      )
      .map((item: any) =>
        [
          item[0]["original-name"].toUpperCase(),
          item[0].properties.alias?.map((alias: string) => alias.toUpperCase()) ?? [],
        ].flat()
      )
      .flat();
  } catch (e) {
    console.error("[AutoLinker] fetchPropertyIgnoreList error:", e);
    return [];
  }
}

const settings: SettingSchemaDesc[] = [
  {
    key: "enableAutoParse",
    description: "Automatically parse the block when leaving it (Enter, Escape, click away)",
    type: "boolean",
    default: false,
    title: "Automatically parse blocks",
  },
  {
    key: "stateKeybinding",
    description: "Keybinding to toggle Automatic Parsing",
    type: "string",
    default: "mod+shift+l",
    title: "Keybinding for Automatic Parsing",
  },
  {
    key: "parseSingleBlockKeybinding",
    description: "Keybinding to parse a single block",
    type: "string",
    default: "alt+shift+l",
    title: "Keybinding for Parsing a Single Block",
  },
  {
    key: "parseSingleWordAsTag",
    description: "Parse single words as tags",
    type: "boolean",
    default: false,
    title: "Parse single words as tags",
  },
  {
    key: "parseAsTags",
    description: "Parse all links as tags",
    type: "boolean",
    default: false,
    title: "Parse all links as tags",
  },
  {
    key: "pagesToIgnore",
    description: "Pages to ignore when generating links",
    type: "string",
    default:
      "a,b,c,card,now,later,todo,doing,done,wait,waiting,canceled,cancelled,started,in-progress",
    title: "Pages to ignore when generating links",
  },
];
logseq.useSettingsSchema(settings);

async function getPages() {
  try {
    const propertyBasedIgnoreList = await fetchPropertyIgnoreList();
    let pagesToIgnore = (logseq.settings?.pagesToIgnore || "")
      .split(",")
      .map((x: string) => x.toUpperCase().trim())
      .concat(propertyBasedIgnoreList);
    pagesToIgnore = [...new Set(pagesToIgnore)];
    const query = `[:find (pull ?p [*]) :where [?p :block/uuid ?u][?p :block/original-name]]`;
    const results = await logseq.DB.datascriptQuery(query);
    pageList = results
      .filter(
        (x: any) => x[0]?.["original-name"] && !pagesToIgnore.includes(x[0]["original-name"].toUpperCase())
      )
      .map((x: any) => x[0]["original-name"])
      .filter((x: string) => x);
    pageList = pageList.concat((await fetchAliases()).flat());
    pageList.sort((a: string, b: string) => b.length - a.length);
    console.log("[AutoLinker] Pages loaded:", pageList.length);
  } catch (e) {
    console.error("[AutoLinker] getPages error:", e);
  }
}

async function parseBlockForLink(uuid: string) {
  if (uuid == null) return;

  try {
    let block = await logseq.Editor.getBlock(uuid);
    if (block == null) return;

    let content = block.content.replaceAll(/{.*}/g, (match: string) => {
      try {
        return getDateForPage(
          Sherlock.parse(match.slice(1, -1)).startDate,
          dateFormat
        );
      } catch {
        return match;
      }
    });

    let needsUpdate = false;
    [content, needsUpdate] = replaceContentWithPageLinks(
      pageList,
      content,
      logseq.settings?.parseAsTags,
      logseq.settings?.parseSingleWordAsTag
    );
    if (needsUpdate) {
      console.log("[AutoLinker] Updating block:", uuid);
      isProcessing = true;
      await logseq.Editor.updateBlock(block.uuid, `${content}`);
      setTimeout(() => { isProcessing = false; }, 500);
    }
  } catch (e) {
    console.error("[AutoLinker] parseBlockForLink error:", e);
    isProcessing = false;
  }
}

const main = async () => {
  console.log("[AutoLinker] Plugin starting...");
  await getPages();
  dateFormat = (await logseq.App.getUserConfigs()).preferredDateFormat;
  console.log("[AutoLinker] Ready. Pages:", pageList.length, "AutoParse:", logseq.settings?.enableAutoParse);

  logseq.DB.onChanged((e: any) => {
    // Guard against re-entry from our own updateBlock calls
    if (isProcessing) return;

    const outlinerOp = e.txMeta?.outlinerOp;

    // Process blocks directly from the event when save-block or insert-blocks fires
    if (
      outlinerOp === "insert-blocks" ||
      outlinerOp === "insertBlocks" ||
      outlinerOp === "save-block" ||
      outlinerOp === "saveBlock"
    ) {
      if (!logseq.settings?.enableAutoParse) return;
      if (!e.blocks?.length) return;

      // Collect unique block UUIDs from the event
      const uuids = [...new Set(e.blocks.map((b: any) => b.uuid).filter(Boolean))] as string[];
      if (uuids.length > 0) {
        console.log("[AutoLinker] Processing", uuids.length, "blocks from", outlinerOp);
        uuids.forEach(parseBlockForLink);
      }
    }
  });

  logseq.App.onCurrentGraphChanged(getPages);

  logseq.Editor.registerBlockContextMenuItem("Parse Block for Links", async (e: any) => {
    await getPages();
    return parseBlockForLink(e.uuid);
  });

  logseq.App.registerCommandShortcut(
    { binding: logseq.settings?.stateKeybinding },
    () => {
      getPages();
      const enabledText = logseq.settings?.enableAutoParse
        ? "disabled"
        : "enabled";
      logseq.App.showMsg(`Auto Parse Links ${enabledText}`);
      logseq.updateSettings({
        enableAutoParse: !logseq.settings?.enableAutoParse,
      });
    }
  );

  logseq.App.registerCommandShortcut(
    { binding: logseq.settings?.parseSingleBlockKeybinding },
    async (e: any) => {
      await getPages();
      parseBlockForLink(e.uuid);
    }
  );
};
logseq.ready(main).catch(console.error);
