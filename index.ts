import '@logseq/libs';
import { SettingSchemaDesc, SimpleCommandKeybinding, UIMsgOptions } from '@logseq/libs/dist/LSPlugin.user';
import Sherlock from 'sherlockjs'
import { getDateForPage } from 'logseq-dateutils'
//Inputs 5 numbered blocks when called
let pageList = []
var blockArray = []
var enableHook = false
var inProcess = false
let dateFormat;

const settings:SettingSchemaDesc[] = [{
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
}]
logseq.useSettingsSchema(settings)
async function getPages() {
  pageList = []
  const query = `[:find (pull ?p [*]) :where [?p :block/uuid ?u][?p :block/name]]`
  logseq.DB.datascriptQuery(query).then(
    (results) => {
      for (const x in results) {
        pageList.push(results[x][0].name)
      }
    }
  )
}
const parseForRegex = (string) => {
  return string
    .replaceAll("[", '\\[')
    .replaceAll("]", '\\]')
    .replaceAll(")", '\\)')
    .replaceAll("(", '\\(')
    .replaceAll("+", '\\+')
    .replaceAll("-", '\\-')
    .replaceAll("{", '\\{')
    .replaceAll("}", '\\}')
}
async function parseBlockForLink(d = null) {
  let content
  let block

  block = await logseq.Editor.getBlock(d)
  content = block.content
  content = content.replaceAll(/{.*}/g, (match) => {
    return getDateForPage(Sherlock.parse(match.slice(1, -1)).startDate, dateFormat)
  })
  //rmeove first and last letter from the result 
  pageList.forEach((value) => {
    const regex = new RegExp(`(\\w*(?<!\\[)\\w*(?<!\\#)\\w*(?<!\\w+:\\/\\/\\S*))\\b(${parseForRegex(value)})\\b`, 'gi')
    if (value.length > 0) {
      if (content.toUpperCase().includes(value.toUpperCase())) {
        inProcess = true
        content = content.replaceAll(regex, (match) => {
          return `[[${match}]]`
        })
        logseq.Editor.updateBlock(block.uuid, `${content}`)
        // setTimeout(() => { inProcess = false }, 300)
      }
    }
  })
  // logseq.Editor.updateBlock(block.uuid, content)
}


const main = async () => {
  getPages()
  dateFormat = (await logseq.App.getUserConfigs()).preferredDateFormat
  logseq.DB.onChanged((e) => {
    if (e.txMeta.outlinerOp == "insertBlocks") {
      if (enableHook) {
        for (const x in blockArray) {
          parseBlockForLink(blockArray[x])
        }
      }
    }
    else {
      //if blocks array doesn't already contain the block uuid, push to it
      const block = e.blocks[0].uuid
      if (!blockArray.includes(block)) {
        blockArray.push(block)
      }
    }
  })
  logseq.App.onCurrentGraphChanged(() => {
    console.log("graph changed")
    getPages()
  })
  logseq.Editor.registerBlockContextMenuItem("Parse Block for Links", (e) => {
    return parseBlockForLink(e.uuid);
  })
  logseq.App.registerCommandShortcut({ binding: logseq.settings.stateKeybinding }, () => {
    getPages()
    if (enableHook) {
      logseq.App.showMsg("Auto Parse Links disabled")
      enableHook = false
    }
    else {
      logseq.App.showMsg("Auto Parse Links enabled")
      enableHook = true
    }
  })
  logseq.App.registerCommandShortcut({ binding: logseq.settings.parseSingleBlockKeybinding }, (e) => {
    getPages()
    if (!enableHook) {
      parseBlockForLink(e.uuid)
    }

  })
}
logseq.ready(main).catch(console.error);
