const fs = require("fs");
const path = require("path");
const { debounce } = require("./debounce");

let callbackFunc = [];
let emoticonsList = [];
let folderNum = 0;
let watcher;

/**
 * 加载本地表情文件夹
 * @param {String} folderPath 表情文件夹路径
 */
async function loadEmoticons(folderPath) {
  emoticonsList = [];
  folderNum = 0;
  await loadFolder(folderPath);
  dispatchUpdateFile();
  if (watcher) {
    watcher.close();
  }
  watcher = fs.watch(
    folderPath,
    { recursive: true },
    debounce(async () => {
      const beforeEmoticonsList = emoticonsList;
      emoticonsList = [];
      folderNum = 0;
      await loadFolder(folderPath);
      if (!arraysAreEqual(beforeEmoticonsList, emoticonsList)) {
        dispatchUpdateFile();
      }
    }, 300),
  );
}

/**
 * 递归加载文件夹
 * @param {String} folderPath 文件夹路径
 * @returns
 */
function loadFolder(folderPath) {
  folderNum = emoticonsList.length;
  if (fs.existsSync(folderPath)) {
    return new Promise((res, rej) => {
      fs.readdir(folderPath, async (err, files) => {
        const deepFolder = []; // 下一层文件夹
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = path.join(folderPath, file);
          const fileStat = fs.statSync(filePath, {
            throwIfNoEntry: false,
          });
          if (fileStat) {
            if (fileStat.isFile()) {
              if (![".gif", ".jpg", ".png", ".webp"].includes(path.extname(filePath))) {
                continue;
              }
              // 初始化表情文件夹
              if (!emoticonsList[folderNum]) {
                emoticonsList[folderNum] = {
                  name: path.basename(folderPath),
                  list: [],
                };
              }
              emoticonsList[folderNum].list.push({
                path: filePath.replace(/\\/g, "/"),
                name: path.basename(filePath),
              });
            } else if (fileStat.isDirectory()) {
              deepFolder.push(filePath);
            }
          }
        }
        // 单独处理递归文件夹
        for (let i = 0; i < deepFolder.length; i++) {
          const filePath = deepFolder[i];
          await loadFolder(filePath);
        }
        res();
      });
    });
  }
}

function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].name !== arr2[i].name || JSON.stringify(arr1[i].list) !== JSON.stringify(arr2[i].list)) {
      return false;
    }
  }
  return true;
}

/**
 * 触发更新回调
 */
function dispatchUpdateFile() {
  callbackFunc.forEach((func) => {
    func(emoticonsList);
  });
}

/**
 * 注册回调方法
 * @param {Function} callback 回调函数
 */
function onUpdateEmoticons(callback) {
  callbackFunc.push(callback);
}

module.exports = { loadEmoticons, onUpdateEmoticons };
