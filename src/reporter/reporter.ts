// jshint esversion: 8
import fs from 'fs';
import path from 'path';
import pug from 'pug';
import HTMLtoDOCX from 'html-to-docx';
import puppeteer from 'puppeteer';
import {spawnSync} from 'node:child_process';
import yaml from 'js-yaml';
import {marked} from 'marked';
import groupBy from "lodash/groupBy";

// it is surprising that https://github.com/jstransformers/jstransformer-marked picks up this object (undocumented API)
// source of this call: https://github.com/markedjs/marked-custom-heading-id/blob/main/src/index.js (MIT License, Copyright (c) 2021 @markedjs)
marked.use({
    renderer: {
        heading(text, level, _) {
            // WEC patch: add \:
            const headingIdRegex = /(?: +|^)\{#([a-z][\:\w-]*)\}(?: +|$)/i;
            const hasId = text.match(headingIdRegex);
            if (!hasId) {
                // fallback to original heading renderer
                return false;
            }
            return `<h${level} id="${hasId[1]}">${text.replace(headingIdRegex, '')}</h${level}>\n`;
        }
    }
});
marked.use(require('marked-smartypants').markedSmartypants());

export interface ReporterArguments {
    outputPath?: string;
    json: boolean;
    yaml: boolean;
    html: boolean;
    pdf: boolean;
    usePandoc: boolean;
    "html-template"?: string;
}

export class Reporter {
    constructor(private args: ReporterArguments) {
    }

    saveJson(data, filename, log = true) {
        const json_dump = JSON.stringify(data, null, 2);

        if (this.args.outputPath) {
            fs.writeFileSync(path.join(this.args.outputPath, filename), json_dump);

        }

        if (log && this.args.json) {
            console.log(json_dump);
        }
    }

    saveYaml(data, filename, log = true) {
        const yaml_dump = yaml.dump(data, {noRefs: true});

        if (this.args.outputPath) {
            fs.writeFileSync(path.join(this.args.outputPath, filename), yaml_dump);
        }

        if (log && this.args.yaml) {
            console.log(yaml_dump);
        }
    }

    readYaml(filename) {
        return yaml.load(
            fs.readFileSync(path.join(this.args.outputPath, filename), "utf8")
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
                groupBy: groupBy,
                marked: marked, // we need to pass the markdown engine to template for access at render-time (as opposed to comile time), see https://github.com/pugjs/pug/issues/1171
                fs: fs,
                yaml: yaml,
                path: path,
                inlineCSS: fs.readFileSync(
                    require.resolve("github-markdown-css/github-markdown.css")
                ),
                filterOptions: {marked: {}},
            })
        );

        if (this.args.outputPath) {
            fs.writeFileSync(path.join(this.args.outputPath, filename), html_dump);
        }

        if (log && this.args.html) {
            console.log(html_dump);
        }

        return html_dump;
    }


    async convertHtmlToPdf(htmlfilename = "inspection.html", pdffilename = "inspection.pdf") {
        if (this.args.pdf && this.args.outputPath) {
            const browser = await puppeteer.launch({});
            const pages = await browser.pages();
            await pages[0].goto("file://" + path.resolve(path.join(this.args.outputPath, htmlfilename)), {waitUntil: 'networkidle0'});
            await pages[0].pdf({
                path: path.resolve(path.join(this.args.outputPath, pdffilename)),
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: `
                      <div style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
                          <div style="bottom: 5px; text-align: center;"><span class="title"></span></div>
                      </div>`,
                footerTemplate: `
                      <div style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
                          <div style="top: 5px; text-align: center;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
                      </div>`,
                margin: {top: '1.5cm', bottom: '1cm'},
            })
            await browser.close();
        }
    }

    async convertHtmlToPdfWithoutDisk(htmlContent: string): Promise<Uint8Array> {
        const browser = await puppeteer.launch({});
        const page = await browser.newPage();
        await page.setContent(htmlContent, {waitUntil: 'networkidle0'});
        let pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `
                      <div style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
                          <div style="bottom: 5px; text-align: center;"><span class="title"></span></div>
                      </div>`,
            footerTemplate: `
                      <div style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
                          <div style="top: 5px; text-align: center;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
                      </div>`,
            margin: {top: '1.5cm', bottom: '1cm'},
        })
        await browser.close();
        return pdfBuffer;
    }


    async generateOfficeDoc(
        data,
        filename = "inspection.docx",
        log = true,
        template = "../assets/template-office.pug"
    ) {
        if (this.args.outputPath) {
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
                    filterOptions: {marked: {}},
                })
            );

            if (this.args.usePandoc) {
                const ret = spawnSync('pandoc', ['-f', 'html', '--number-sections', '--toc', '--output', filename], {
                    cwd: this.args.outputPath,
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
                    pageSize: {width: "21.0cm", height: "29.7cm"},
                    pageNumber: true,
                    title: data.title,
                    lang: "en-UK",
                    creator: `EDPS Website Evidence Collector v${data.script.version.npm} using NPM html-to-docx`,
                };
                const fileBuffer = await HTMLtoDOCX(html_dump, null, documentOptions, null);
                fs.writeFileSync(path.join(this.args.outputPath, filename), fileBuffer);
            }
        }
    }

    saveSource(source, filename = "source.html") {
        if (this.args.outputPath) {
            fs.writeFileSync(path.join(this.args.outputPath, filename), source);
        }
    }
}
