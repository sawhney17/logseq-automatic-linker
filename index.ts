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
async function parseBlockForLink(e) {
  console.log(e)
  const block = e.blocks[0]
  let content = block.content
  console.log(content)
  content = content.replaceAll(/{.*}/g, (match) => {
    console.log(Sherlock.parse(match.slice(1, -1)).startDate)
    console.log(match)
    return getDateForPage(Sherlock.parse(match.slice(1, -1)).startDate, dateFormat)
  })

  //rmeove first and last letter frmo the 

  console.log()
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
  logseq.App.registerCommandShortcut({ binding: 'mod+shift+l' }, () => {
    if (enableHook) {
      logseq.App.showMsg("Auto Parse Links disabled")
      enableHook = false
    }
    else {
      logseq.App.showMsg("Auto Parse Links enabled")
      enableHook = true
    }
  })
}
logseq.ready(main).catch(console.error);
