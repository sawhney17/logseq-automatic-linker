import '@logseq/libs';
import { SimpleCommandKeybinding, UIMsgOptions } from '@logseq/libs/dist/LSPlugin.user';
import Sherlock from 'sherlockjs'
import { getDateForPage } from 'logseq-dateutils'
//Inputs 5 numbered blocks when called
let pageList = []
var enableHook = false
var inProcess = false
let dateFormat;
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
async function parseBlockForLink(e = null, d = null) {
  let content
  let block
  if (e != null) {
    block = e.blocks[0]

  }
  else {
    block = await logseq.Editor.getBlock(d)
  }
  content = block.content
  content = content.replaceAll(/{.*}/g, (match) => {
    return getDateForPage(Sherlock.parse(match.slice(1, -1)).startDate, dateFormat)
  })

  //rmeove first and last letter from the result 
  pageList.forEach((value) => {
    const regex = new RegExp(`(\\w*(?<!\\[)\\w*(?<!\\#))\\b(${parseForRegex(value)})\\b`, 'gi')
    if (value.length > 0) {
      if (content.toUpperCase().includes(value.toUpperCase())) {
        inProcess = true
        content = content.replaceAll(regex, (match) => {
          return `[[${match}]]`
        })
        logseq.Editor.updateBlock(block.uuid, `${content} `)
        setTimeout(() => { inProcess = false }, 300)
      }
    }
  })
  // logseq.Editor.updateBlock(block.uuid, content)
}


const main = async () => {
  getPages()
  dateFormat = (await logseq.App.getUserConfigs()).preferredDateFormat
  logseq.DB.onChanged((e) => {
    if (enableHook && !inProcess) {
      parseBlockForLink(e)
    }
  })
  logseq.App.onCurrentGraphChanged(() => {
    console.log("graph changed")
    getPages()
  })
  logseq.Editor.registerBlockContextMenuItem("Parse Block for Links", (e) => {
    return parseBlockForLink(null, e.uuid);
  })
  logseq.App.registerCommandShortcut({ binding: 'mod+shift+l' }, () => {
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
  logseq.App.registerCommandShortcut({ binding: 'mod+p' }, (e) => {
    getPages()
    console.log("Parse")
    if (!enableHook) {
      parseBlockForLink(null, e.uuid)
    }

  })
}
logseq.ready(main).catch(console.error);
