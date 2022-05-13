import '@logseq/libs';
import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user';
// @ts-ignore
import Sherlock from 'sherlockjs'
import { getDateForPage } from 'logseq-dateutils'

let pageList: string[] = []
let blockArray: string[] = [];
let dateFormat = "";

const settings: SettingSchemaDesc[] = [{
  key: "enableAutoParse",
  description: "Automatically parse the block on enter",
  type: "boolean",
  default: false,
  title: "Automatically parse the block on enter"
},
{
  key: "stateKeybinding",
  description: "Keybinding to toggle Automatic Parsing",
  type: "string",
  default: "mod+shift+l",
  title: "Keybinding for Automatic Parsing"
},
{
  key: "parseSingleBlockKeybinding",
  description: "Keybinding to parse a single block",
  type: "string",
  default: "mod+p",
  title: "Keybinding for Parsing a Single Block"
},
{
  key: "parseSingleWordAsTag",
  description: "Parse single words as tags",
  type: "boolean",
  default: false,
  title: "Parse single words as tags"
},
{
  key: "parseAsTags",
  description: "Parse all links as tags",
  type: "boolean",
  default: false,
  title: "Parse all links as tags"
},
{
  key: "pagesToIgnore",
  description: "Pages to ignore when generating links",
  type: "string",
  default: "a,b,c,card,now,later,todo,doing,done,wait,waiting,canceled,cancelled,started,in-progress",
  title: "Pages to ignore when generating links"
}]
logseq.useSettingsSchema(settings)
async function getPages() {
  const pagesToIgnore = logseq.settings?.pagesToIgnore.split(',').map(x => x.toUpperCase().trim())
  const query = `[:find (pull ?p [*]) :where [?p :block/uuid ?u][?p :block/original-name]]`
  logseq.DB.datascriptQuery(query).then(
    (results) => {
      pageList = results
        .filter(x => !pagesToIgnore.includes(x[0]['original-name'].toUpperCase()))
        .map(x => x[0]['original-name'])
    }
  )
}
const parseForRegex = (s: string) => {
  return s
    .replaceAll("[", '\\[')
    .replaceAll("]", '\\]')
    .replaceAll(")", '\\)')
    .replaceAll("(", '\\(')
    .replaceAll("+", '\\+')
    .replaceAll("-", '\\-')
    .replaceAll("{", '\\{')
    .replaceAll("}", '\\}')
}
async function parseBlockForLink(d: string) {
  let block = await logseq.Editor.getBlock(d)
  let content = block.content.replaceAll(/{.*}/g, (match) => {
    return getDateForPage(Sherlock.parse(match.slice(1, -1)).startDate, dateFormat)
  })
  //rmeove first and last letter from the result 
  let needsUpdate = false

  pageList.forEach((value) => {
    const regex = new RegExp(`(\\w*(?<!\\[)\\w*(?<!\\#)\\w*(?<!\\w+:\\/\\/\\S*))\\b(${parseForRegex(value)})\\b`, 'gi')
    if (value.length > 0) {
      if (content.toUpperCase().includes(value.toUpperCase())) {
        content = content.replaceAll(regex, (match) => {
          const hasSpaces = /\s/g.test(match)
          if (logseq.settings?.parseAsTags || (logseq.settings?.parseSingleWordAsTag && !hasSpaces)) {
            return hasSpaces ? `#[[${value}]]` : `#${value}`
          }
          return `[[${value}]]`
        })
        needsUpdate = true
        // setTimeout(() => { inProcess = false }, 300)
      }
    }
  })
  // logseq.Editor.updateBlock(block.uuid, content)
  if(needsUpdate) {
    logseq.Editor.updateBlock(block.uuid, `${content}`)
  }
}


const main = async () => {
  getPages()
  dateFormat = (await logseq.App.getUserConfigs()).preferredDateFormat
  logseq.DB.onChanged((e) => {
    if (e.txMeta?.outlinerOp == "insertBlocks") {
      if (logseq.settings?.enableAutoParse) {
        blockArray.forEach(parseBlockForLink)
      }
    } else {
      //if blocks array doesn't already contain the block uuid, push to it
      const block = e.blocks[0].uuid
      if (!blockArray.includes(block)) {
        blockArray.push(block)
      }
    }
  })
  logseq.App.onCurrentGraphChanged(getPages)
  logseq.Editor.registerBlockContextMenuItem("Parse Block for Links", (e) => {
    return parseBlockForLink(e.uuid);
  })
  logseq.App.registerCommandShortcut({ binding: logseq.settings?.stateKeybinding }, () => {
    getPages()
    blockArray = []
    const enabledText = logseq.settings?.enableAutoParse ? 'disabled' : 'enabled'
    logseq.App.showMsg(`Auto Parse Links ${enabledText}`)
    logseq.updateSettings({ enableAutoParse: !logseq.settings?.enableAutoParse })
  })
  logseq.App.registerCommandShortcut({ binding: logseq.settings?.parseSingleBlockKeybinding }, (e) => {
    getPages()
    if (!logseq.settings?.enableAutoParse) {
      parseBlockForLink(e.uuid)
    }
  })
}
logseq.ready(main).catch(console.error);
