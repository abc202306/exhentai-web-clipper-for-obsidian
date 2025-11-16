// ==UserScript==
// @name         EXHentai Web Clipper for Obsidian
// @namespace    https://exhentai.org
// @version      v1.0.12.20251116
// @description  🔞 A user script that exports EXHentai gallery metadata as Obsidian Markdown files (Obsidian EXHentai Web Clipper).
// @author       abc202306
// @match        https://exhentai.org/g/*
// @icon         none
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  class Main {
    util;

    // Entry point
    static main() {
      new Main(new Util());
    }

    constructor(util) {
      this.util = util;
      this.util.startWebclipperWithDelay(
        2000,
        "EXHentai Web Clipper for Obsidian (a tampermonkey user script by abc202306) says:\n\nDo you want to proceed to clip the exhentai gallery metadata as a obsidian markdown note (by obsidian uri protocol api)?\n\nclick 'OK' to proceed, or 'Cancel' to abort.",
        this.getEXHentaiGalleryData.bind(this),
        this.getEXHentaiOBMDNoteFileContent.bind(this)
      );
    }

    // Extract metadata from page
    getEXHentaiGalleryData() {
      const gn = document.getElementById("gn");
      const gj = document.getElementById("gj");
      const gdd = document.getElementById("gdd");
      const gdc = document.getElementById("gdc");
      const gdn = document.getElementById("gdn");
      const taglist = document.getElementById("taglist");

      const titleEN = this.util.getTitleStr(gn);
      const titleJP = this.util.getTitleStr(gj);

      const now = this.util.getLocalISOStringWithTimezone();

      const data0 = Object.fromEntries([...(gdd && gdd.firstChild && gdd.firstChild.firstChild ? gdd.firstChild.firstChild.childNodes : [])].map(c => {
        let key = c.children[0].innerText.replace(/:$/, "").toLowerCase().replaceAll(/\s/g, "");
        let value;
        if (key === "posted") {
          key = "uploaded";
          const postedTimeData = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2})$/.exec(c.children[1].innerText).groups;
          value = postedTimeData.year + "-" + postedTimeData.month + "-" + postedTimeData.day + "T" + postedTimeData.hour + ":" + postedTimeData.minute + ":00Z";
        } else if (key === "parent") {
          value = (c.children[1].firstChild && c.children[1].firstChild.href) || c.children[1].innerText;
        } else if (key === "visible") {
          value = c.children[1].innerText;
        } else if (key === "language") {
          const languageStr = c.children[1].innerText;
          if (languageStr.length === 0) {
            value = [];
          } else {
            value = c.children[1].innerText.split(/\s+/).filter(i => i.length !== 0).map(i => (i === "TR") ? ("[[translated]]") : ("[[" + i.toLowerCase() + "]]"));
          }
        } else if (key === "filesize") {
          value = c.children[1].innerText;
        } else if (key === "length") {
          key = "pagecount";
          value = parseInt(c.children[1].innerText.replace(/ pages$/, ""));
        } else if (key === "favorited") {
          value = parseInt(c.children[1].innerText.replace(/ times$/, ""));
        } else {
          value = c.children[1].innerText;
        }
        return [key, value];
      }));

      const data0Length = 7;
      if (data0.length !== data0Length) {
        throw new Error(`exhentai-web-clipper-for-obsidian: gdd data length changed (expected ${data0Length}, got ${data0.length})`);
      }

      const gidPairResult = /^https?:\/\/e[x\-]hentai.org\/g\/(\d*)\/([a-z\d]*)\/?/.exec(window.location.href);
      const galleryID = gidPairResult ? gidPairResult[1] : null;
      const galleryToken = gidPairResult ? gidPairResult[2] : null;

      const data = {
        title: this.util.sanitizeTitle(titleJP || titleEN, " 【exhentai】"),
        english: titleEN,
        japanese: titleJP,
        url: window.location.href,

        // coverPromise: fetch cover URL once; swallow errors and resolve to empty string on failure
        coverPromise: fetch('https://api.e-hentai.org/api.php', { method: "POST", body: JSON.stringify({ "method": "gdata", "gidlist": [[galleryID, galleryToken]], "namespace": 1 }) })
          .then(response => response.ok ? response.json() : Promise.reject(new Error('cover fetch failed')))
          .then(json => (json && json.gmetadata && json.gmetadata[0] && json.gmetadata[0].thumb) || "")
          .catch(() => ""),

        categories: (gdc && gdc.innerText) ? ["[[" + gdc.innerText.trim().toLowerCase().replaceAll(/\s/g,"-") + "]]"] : [], // gd3.Category => categories

        uploader: (gdn && gdn.innerText) ? ["[[" + gdn.innerText.trim() + "]]"] : [], // gd3.Uploader => uploader

        uploaded: data0.uploaded, // gd3.Posted => uploaded
        parent: data0.parent, // gd3.Parent => parent
        visible: data0.visible, // gd3.Visible => visible
        language: data0.language, // gd3.Language and gd4.language => language
        filesize: data0.filesize, // gd3.Filesize => filesize
        pagecount: data0.pagecount, // gd3.length => pagecount
        favorited: data0.favorited, // gd3.Favorited => favorited

        rating: parseFloat(document.getElementById("rating_label").innerText.replace(/Average: ([\d\.]*)/, "$1")),

        ctime: now,
        mtime: now,

        keywords: [],
        parody: [],
        character: [],
        artist: [],
        group: [],
        female: [],
        male: [],
        mixed: [],
        location: [],
        other: [],
        unindexedData: {}
      };

      const dataKeyIndexed = Object.keys(data);

      if (taglist && taglist.firstChild && taglist.firstChild.firstChild) {
        [...taglist.firstChild.firstChild.children].forEach(c => {
          const key = (c.children[0] && c.children[0].innerText ? c.children[0].innerText.replace(/:$/, "").toLowerCase().replaceAll(/\s/g, "") : "");
          const value = (c.children[1] && c.children[1].innerText) ? c.children[1].innerText.split("\n").map(i => "[[" + this.util.getTagNameStr(i) + "]]" ) : [];

          let newValue;
          if (Array.isArray(data[key])) {
            newValue = data[key].concat(value);
          } else if (data[key]) {
            newValue = [data[key]].concat(value);
          } else {
            newValue = value;
          }

          if (Array.isArray(newValue)) {
            newValue = [...new Set(newValue)];
          }

          if (dataKeyIndexed.includes(key)) {
            data[key] = newValue;
          } else {
            data.unindexedData[key] = newValue;
          }
        });
      }

      return data;
    }

    // Build Obsidian note content
    async getEXHentaiOBMDNoteFileContent(data) {
      const coverUrl = await data.coverPromise;
      return `---
up:
  - "[[Gallery]]"
categories:${this.util.getYamlArrayStr(data.categories)}
keywords:${this.util.getYamlArrayStr(data.keywords)}
female:${this.util.getYamlArrayStr(data.female)}
male:${this.util.getYamlArrayStr(data.male)}
mixed:${this.util.getYamlArrayStr(data.mixed)}
location:${this.util.getYamlArrayStr(data.location)}
other:${this.util.getYamlArrayStr(data.other)}
english: "${data.english}"
japanese: "${data.japanese}"
url: "${data.url}"
artist:${this.util.getYamlArrayStr(data.artist)}
group:${this.util.getYamlArrayStr(data.group)}
parody:${this.util.getYamlArrayStr(data.parody)}
character:${this.util.getYamlArrayStr(data.character)}
language:${this.util.getYamlArrayStr(data.language)}
pagecount: ${data.pagecount}
cover: "${coverUrl}"
uploader:${this.util.getYamlArrayStr(data.uploader)}
parent: "${data.parent}"
visible: "${data.visible}"
filesize: "${data.filesize}"
favorited: ${data.favorited}
rating: ${data.rating}
uploaded: ${data.uploaded}
ctime: ${data.ctime}
mtime: ${data.mtime}${this.util.getUnindexedDataFrontMatterPartStrBlock(data.unindexedData)}
---

# ${data.title}

![200](${coverUrl})

| | |
| --- | --- |
| title_en | \`${this.util.escapePipe(data.english)}\` |
| title_jp | \`${this.util.escapePipe(data.japanese)}\` |
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
| rating | ${data.rating} |${this.util.getUnindexedDataTablePartStrBlock(data.unindexedData)}
`;
    }
  }
  
  // utils  

  class Util {
    startWebclipperWithDelay(timeout, message, getGalleryData, getOBMDNoteFileContent) {
      setTimeout(async () => {
        if (confirm(message)) {
          const galleryData = getGalleryData();
          const content = await Promise.resolve(getOBMDNoteFileContent(galleryData));
          const obsidianURI = this.getObsidianURI(galleryData.title, content);
          window.location.href = obsidianURI;
        }
      }, timeout);
    }

    // Build Obsidian URI
    getObsidianURI(theOBMDNotefileBaseName, theOBMDNoteFileContent) {
      const params = [
        ["file", `acg/galleries/${theOBMDNotefileBaseName}`],
        ["content", theOBMDNoteFileContent],
        ["append", "1"]
      ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

      return `obsidian://new?${params}`;
    }

    getUnindexedDataFrontMatterPartStrBlock(unindexedData) {
      return Object.entries(unindexedData).map(([key, value]) => 
        Array.isArray(value) ? `\n${key}:${this.getYamlArrayStr(value)}` : `\n${key}: "${value}"`
      ).join('');
    }

    getUnindexedDataTablePartStrBlock(unindexedData) {
      return Object.entries(unindexedData).map(([key, value]) => 
        `\n| ${key} | ${Array.isArray(value) ? value.join(", ") : value} |`
      ).join('');
    }

    escapePipe(str) {
      return (str || "").replace(/\|/g, "\\|");
    }

    sanitizeTitle(titleStr, addtionalSuffix) {
      return (titleStr + addtionalSuffix)
        .replace(/\[/g, "【")
        .replace(/\]/g, "】")
        .replace(/[\\\/\|\*\?\:\<\>\"]/g, "_")
        .replace(/\s{2,}/g, " ");
    }

    getTitleStr(titleEl) {
      if (!titleEl) return "";
      return titleEl.innerText.replace(/\s{2,}/g, " ");
    }

    getTagNameStr(str) {
      return str.trim()
        .replace(/\s+/g, "-")
        .replace("-|-", "-or-");
    }

    getLocalISOStringWithTimezone() {
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

    getYamlArrayStr(arr) {
      return arr.map(i => `\n  - "${i}"`).join("");
    }
  }

  Main.main();
})();