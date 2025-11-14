// ==UserScript==
// @name         EXHentai Web Clipper for Obsidian
// @namespace    https://exhentai.org
// @version      v1.0.1.20251114
// @description  🔞 A user script that exports EXHentai gallery metadata as Obsidian Markdown files (Obsidian EXHentai Web Clipper).
// @author       abc202306
// @match        https://exhentai.org/g/*
// @icon         none
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // Entry point
  setTimeout(startNHentaiWebclipper, 2000);

  async function startNHentaiWebclipper() {
    const data = getData();
    const fileContent = await getFileContent(data);
    const obsidianURI = getObsidianURI(data.title, fileContent);

    if (confirm("Do you want to proceed?")) {
      window.location.href = obsidianURI;
    }
  }

  // Build Obsidian URI
  function getObsidianURI(title, fileContent) {
    const params = [
      ["file", `acg/galleries/${title}`],
      ["content", fileContent],
      ["append", "1"]
    ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

    return `obsidian://new?${params};`;
  }

  // Extract metadata from page
  function getData() {
    const info = document.getElementById("gm");
    const titleEN = document.getElementById("gn");
    const titleJP = document.getElementById("gj");

    const now = getLocalISOStringWithTimezone();

    const data0 = Object.fromEntries([...document.getElementById("gdd").firstChild.firstChild.childNodes].map(c=>{
        let key =c.children[0].innerText.replace(/:$/,"").toLowerCase().replaceAll(/\s/g,"");
        let value;
        if (key === "posted") {
            key = "uploaded";
            const postedTimeData = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2})$/.exec(c.children[1].innerText).groups;
            value = postedTimeData.year+"-"+postedTimeData.month+"-"+postedTimeData.day+"T"+postedTimeData.hour+":"+postedTimeData.minute+":00Z";
        } else if (key === "parent") {
            value = c.children[1].firstChild.href||c.children[1].innerText;
        } else if (key === "visible") {
            value = c.children[1].innerText;
        } else if (key === "language") {
            value = c.children[1].innerText.split(/\s+/).map(i=>(i==="TR")?("[[translated]]"):("[["+i+"]]"));
        } else if (key === "filesize") {
            value = c.children[1].innerText;
        } else if (key === "length") {
            key = "pagecount";
            value = parseInt(c.children[1].innerText.replace(/ pages$/,""));
        } else if (key === "favorited") {
            value = parseInt(c.children[1].innerText.replace(/ times$/,""));
        } else {
            value = c.children[1].innerText;
        }
        return [key, value];
    }))


    const gidPairResult = /^https?:\/\/e[x\-]hentai.org\/g\/(\d*)\/([a-z\d]*)\/?/.exec(window.location.href);
    const galleryID = gidPairResult ? gidPairResult[1] : null;
    const galleryToken = gidPairResult ? gidPairResult[2] : null;

    const data = {
      title: sanitizeTitle(getTitleStr(titleJP || titleEN)),
      english: getTitleStr(titleEN),
      japanese: getTitleStr(titleJP),
      url: window.location.href,
      
      coverPromise: fetch('https://api.e-hentai.org/api.php',{method: "POST",body:JSON.stringify({"method": "gdata", "gidlist": [[galleryID,galleryToken]], "namespace": 1})}).then(response=>{console.log(response);return response.json()}).then(json=>{console.log(json);return json.gmetadata[0].thumb}),
      
      categories: ["[["+document.getElementById("gdc").innerText+"]]"], // gd3.Category => categories

      uploader: ["[["+document.getElementById("gdn").innerText+"]]"], // gd3.Uploader => uploader
      
      uploaded: data0.uploaded, // gd3.Posted => uploaded
      parent: data0.parent, // gd3.Parent => parent
      visible: data0.visible, // gd3.Visible => visible
      language: data0.language, // gd3.Language and gd4.language => language
      filesize: data0.filesize, // gd3.Filesize => filesize
      pagecount: data0.pagecount, // gd3.length => pagecount
      favorited: data0.favorited, // gd3.Favorited => favorited

      rating: parseFloat(document.getElementById("rating_label").innerText.replace(/Average: ([\d\.]*)/,"$1")),
      
      ctime: now,
      mtime: now,

      keywords: [],
      parody: [],
        character: [],
        artist: [],
        group: [],
        language: [],
        female: [],
        male: [],
        mixed: [],
        location: [],
        other: [],
    };

    [...document.getElementById("taglist").firstChild.firstChild.children].map(c=>{
        const key = c.children[0].innerText.replace(/:$/,"").toLowerCase().replaceAll(/\s/g,"");
        const value = c.children[1].innerText.split("\n").map(i=>"[["+getTagNameStr(i)+"]]");
        
        if (Array.isArray(data[key])) {
            data[key] = data[key].concat(value);
        } else if (data[key]) {
            data[key] = [data[key]].concat(value);
        } else {
            data[key] = value;
        }
    });

    return data;
  }

  // Build Obsidian note content
  async function getFileContent(data) {
    const escapePipe = str => str.replace(/\|/g, "\\|");

    return `---
up:
  - "[[Gallery]]"
categories:${getYamlArrayStr(data.categories)}
keywords:${getYamlArrayStr(data.keywords)}
female:${getYamlArrayStr(data.female)}
male:${getYamlArrayStr(data.male)}
mixed:${getYamlArrayStr(data.mixed)}
location:${getYamlArrayStr(data.location)}
other:${getYamlArrayStr(data.other)}
english: "${data.english}"
japanese: "${data.japanese}"
url: "${data.url}"
artist:${getYamlArrayStr(data.artist)}
group:${getYamlArrayStr(data.group)}
parody:${getYamlArrayStr(data.parody)}
character:${getYamlArrayStr(data.character)}
language:${getYamlArrayStr(data.language)}
pagecount: ${data.pagecount}
cover: "${await data.coverPromise}"
uploader:${getYamlArrayStr(data.uploader)}
parent: "${data.parent}"
visible: "${data.visible}"
filesize: "${data.filesize}"
favorited: ${data.favorited}
rating: ${data.rating}
uploaded: ${data.uploaded}
ctime: ${data.ctime}
mtime: ${data.mtime}
---

# ${data.title}

![200](${await data.coverPromise})

| | |
| --- | --- |
| title_en | \`${escapePipe(data.english)}\` |
| title_jp | \`${escapePipe(data.japanese)}\` |
| url | ${data.url} |
| parody | ${data.parody.join(", ")} |
| character | ${data.character.join(", ")} |
| keywords | ${data.keywords.join(", ")} |
| artist | ${data.artist.join(", ")} |
| group | ${data.group.join(", ")} |
| languages | ${data.language.join(", ")} |
| categories | ${data.categories.join(", ")} |
| female | ${data.female.join(", ")} |
| male | ${data.male.join(", ")} |
| mixed | ${data.mixed.join(", ")} |
| location | ${data.location.join(", ")} |
| other | ${data.other.join(", ")} |
| pagecount | ${data.pagecount} |
| uploader | ${data.uploader.join(", ")} |
| uploaded | ${data.uploaded} |
| parent | ${data.parent} |
| visible | ${data.visible} |
| filesize | ${data.filesize} |
| favorited | ${data.favorited} |
| rating | ${data.rating} |
`;
  }

  // Helpers
  function sanitizeTitle(str) {
    return (str + " 【exhentai】")
      .replaceAll("[", "【")
      .replaceAll("]", "】")
      .replaceAll(/[?:]/g, "_")
      .replaceAll(/\s{2,}/g, " ");
  }

  function getTitleStr(titleEl) {
    if (!titleEl) return "";
    return titleEl.innerText.replace(/\s{2,}/g, " ");
  }

  function getTagNameStr(str){
    return str.trim()
      .replace(/\s+/g, "-")
      .replace("-|-", "-or-");
  }

  function getLocalISOStringWithTimezone() {
    const date = new Date();
    const pad = n => String(n).padStart(2, "0");

    const offset = -date.getTimezoneOffset(); // actual UTC offset in minutes
    const sign = offset >= 0 ? "+" : "-";
    const hours = pad(Math.floor(Math.abs(offset) / 60));
    const minutes = pad(Math.abs(offset) % 60);

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
      `${sign}${hours}:${minutes}`;
  }

  function getYamlArrayStr(arr) {
    return arr.map(i => `\n  - "${i}"`).join("");
  }

})();