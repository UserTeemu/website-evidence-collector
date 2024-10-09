// jshint esversion: 8

const fs = require("fs-extra");
const yaml = require("js-yaml");
const path = require("path");
const pug = require("pug");
const HTMLtoDOCX = require("html-to-docx");
const { spawnSync } = require('node:child_process');
const puppeteer = require("puppeteer");
const marked = require('marked');
// it is surprising that https://github.com/jstransformers/jstransformer-marked picks up this object (undocumented API)
// source of this call: https://github.com/markedjs/marked-custom-heading-id/blob/main/src/index.js (MIT License, Copyright (c) 2021 @markedjs)
marked.use({renderer: {
      heading(text, level, raw, slugger) {
        // WEC patch: add \:
        const headingIdRegex = /(?: +|^)\{#([a-z][\:\w-]*)\}(?: +|$)/i;
        const hasId = text.match(headingIdRegex);
        if (!hasId) {
          // fallback to original heading renderer
          return false;
        }
        return `<h${level} id="${hasId[1]}">${text.replace(headingIdRegex, '')}</h${level}>\n`;
      }
}});
marked.use(require('marked-smartypants').markedSmartypants());

class Reporter {
  constructor(args) {
    this.args = args;
  }

  saveJson(data, filename, log = true) {
    const json_dump = JSON.stringify(data, null, 2);

    if (this.args.output) {
      fs.writeFileSync(path.join(this.args.output, filename), json_dump);
    }

    if (log && this.args.json) {
      console.log(json_dump);
    }
  }

  saveYaml(data, filename, log = true) {
    const yaml_dump = yaml.dump(data, { noRefs: true });

    if (this.args.output) {
      fs.writeFileSync(path.join(this.args.output, filename), yaml_dump);
    }

    if (log && this.args.yaml) {
      console.log(yaml_dump);
    }
  }

  readYaml(filename) {
    return yaml.load(
        fs.readFileSync(path.join(this.args.output, filename), "utf8")
    );
  }

  generateHtml(
      data,
      filename = "inspection.html",
      log = true,
      template = "../assets/template.pug"
  ) {
    const html_template =
        this.args["html-template"] || path.join(__dirname, template);
    const html_dump = pug.renderFile(
        html_template,
        Object.assign({}, data, {
          pretty: true,
          basedir: path.join(__dirname, "../assets"),
          jsondir: ".", // images in the folder of the inspection.json
          groupBy: require("lodash/groupBy"),
          marked: marked, // we need to pass the markdown engine to template for access at render-time (as opposed to comile time), see https://github.com/pugjs/pug/issues/1171
          fs: fs,
          yaml: yaml,
          path: path,
          inlineCSS: fs.readFileSync(
              require.resolve("github-markdown-css/github-markdown.css")
          ),
          filterOptions: { marked: {} },
        })
    );

    if (this.args.output) {
      fs.writeFileSync(path.join(this.args.output, filename), html_dump);
    }

    if (log && this.args.html) {
      console.log(html_dump);
    }

    return html_dump;
  }

  async convertHtmlToPdf(htmlfilename = "inspection.html", pdffilename = "inspection.pdf") {
    if (this.args.pdf && this.args.output) {
      const browser = await puppeteer.launch({
        headless: 'new',
      });
      const pages = await browser.pages();
      await pages[0].goto("file://" + path.resolve(path.join(this.args.output, htmlfilename)), {waitUntil: 'networkidle0'});
      await pages[0].pdf({
        path: path.resolve(path.join(this.args.output, pdffilename)),
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
              <div style="bottom: 5px; text-align: center;"><span class="title"></span></div>
          </div>
        `,
        footerTemplate: `
          <div style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
              <div style="top: 5px; text-align: center;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
          </div>
        `,
        margin: { top: '1.5cm', bottom: '1cm' },
      })
      await browser.close();
    }
  }

  async generateOfficeDoc(
      data,
      filename = "inspection.docx",
      log = true,
      template = "../assets/template-office.pug"
  ) {
    if (this.args.output) {
      const office_template =
          this.args["office-template"] || path.join(__dirname, template);
      const html_dump = pug.renderFile(
          office_template,
          Object.assign({}, data, {
            pretty: true,
            basedir: path.join(__dirname, "../assets"),
            jsondir: ".", // images in the folder of the inspection.json
            groupBy: require("lodash/groupBy"),
            marked: marked, // we need to pass the markdown engine to template for access at render-time (as opposed to comile time), see https://github.com/pugjs/pug/issues/1171
            fs: fs,
            yaml: yaml,
            path: path,
            inlineCSS: fs.readFileSync(
                require.resolve("github-markdown-css/github-markdown.css")
            ),
            filterOptions: { marked: {} },
          })
      );

      if (this.args.usePandoc) {
        const ret = spawnSync('pandoc', ['-f', 'html', '--number-sections', '--toc', '--output', filename], {
          cwd: this.args.output,
          input: html_dump,
          encoding: 'utf8',
        });
        if (ret[2]) {
          console.log(ret[2]);
        }
      } else {
        if (filename.endsWith(".odt")) {
          console.error("To generate .odt, you must have pandoc installed and specify --use-pandoc.");
          process.exit(1);
        }

        const documentOptions = {
          orientation: "portrait",
          pageSize: { width: "21.0cm", height: "29.7cm" },
          pageNumber: true,
          title: data.title,
          lang: "en-UK",
          creator: `EDPS Website Evidence Collector v${data.script.version.npm} using NPM html-to-docx`,
        };
        const fileBuffer = await HTMLtoDOCX(html_dump, null, documentOptions, null);
        fs.writeFileSync(path.join(this.args.output, filename), fileBuffer);
      }
    }
  }

  saveSource(source, filename = "source.html") {
    if (this.args.output) {
      fs.writeFileSync(path.join(this.args.output, filename), source);
    }
  }
}

module.exports = Reporter;
