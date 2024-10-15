#!/usr/bin/env node
// jshint esversion: 8

/**
 * @file Produces an html output documenting evidence from websites on processed data in transit and at rest.
 * @author Robert Riemann <robert.riemann@edps.europa.eu>
 * @copyright European Data Protection Supervisor (2019)
 * @license EUPL-1.2
 *
 * @example while inotifywait -e modify assets/template.pug; do ./create-html.js output/inspection.json > output/inspection.html; done
 */


import fs from 'fs';
import path from 'path';
import pug from 'pug';
import HTMLtoDOCX from 'html-to-docx';
import puppeteer from 'puppeteer';
import {spawnSync} from 'node:child_process';
import yaml from 'js-yaml';
import {all as unsafe} from 'js-yaml-js-types';
import {marked} from 'marked';

yaml.DEFAULT_SCHEMA = yaml.DEFAULT_SCHEMA.extend(unsafe);

export interface ReporterCommandOptions {
    inspectionJsonPath: string;
    outputFile?: string;
    htmlTemplate?: string;
    officeTemplate?: string;
    extraFile?: string;
    usePandoc?: boolean;
}

/// Code that gets called when invoking the reporter command using the CLI
export async function reporterCommand(args: ReporterCommandOptions) {
    let output = JSON.parse(fs.readFileSync(args.inspectionJsonPath, 'utf8'));

    let html_template =
        args.htmlTemplate || path.join(__dirname, "../assets/template.pug");
    let office_template =
        args.officeTemplate || path.join(__dirname, "../assets/template-office.pug");

    let jsondir = path.relative(args.outputFile ? path.dirname(args.outputFile) : process.cwd(), path.dirname(args.inspectionJsonPath)); // path of the inspection.json


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

    const make_office = args.outputFile && (args.outputFile.endsWith(".docx") || args.outputFile.endsWith(".odt"));
    const make_pdf = args.outputFile && args.outputFile.endsWith(".pdf");

    let html_dump = pug.renderFile(
        make_office ? office_template : html_template,
        Object.assign({}, output, {
            pretty: true,
            basedir: path.resolve(path.join(__dirname, '../assets')), // determines root director for pug
            jsondir: jsondir || ".",
            // expose some libraries to pug templates
            groupBy: require("lodash/groupBy"),
            marked: marked, // we need to pass the markdown engine to template for access at render-time (as opposed to comile time), see https://github.com/pugjs/pug/issues/1171
            fs: fs,
            yaml: yaml,
            path: path,
            inlineCSS: fs.readFileSync(
                require.resolve("github-markdown-css/github-markdown.css")
            ),
            inspection: output,
            extra: args.extraFile,
            filterOptions: {marked: {}},
        })
    );

    if (!args.outputFile) {
        console.log(html_dump);
        return;
    }

    if (make_office) {
        await generateOfficeFile(args.usePandoc, html_dump, output, args.outputFile)
        return;
    }

    if (make_pdf) {
        await generatePdf(args.outputFile, html_dump)
        return;
    }

    fs.writeFileSync(path.join(args.outputFile), html_dump);

}

async function generateOfficeFile(usePandoc: boolean, html_dump: string, output: any, outputFile?: string) {
    if (usePandoc) {
        // console.warn("Using pandoc to generate", argv.outputFile);
        // pandoc infers the output format from the output file name
        let ret = spawnSync('pandoc', ['-f', 'html', '--number-sections', '--toc', '--output', outputFile], {
            // cwd: '.',
            input: html_dump,
            encoding: 'utf8',
        });
        if (ret[2]) {
            console.log(ret[2]);
        }
        return;
    }
    if (outputFile.endsWith(".odt")) {
        console.error("To generate .odt, you must have pandoc installed and specify --use-pandoc.");
        process.exit(1);
    }

    // console.warn("Using NPM html-to-docx to generate", argv.outputFile);
    const documentOptions = {
        // decodeUnicode: true,
        orientation: "portrait",
        pageSize: {width: "21.0cm", height: "29.7cm"},
        pageNumber: true,
        // lineNumber: true,
        // lineNumberOptions: {countBy: 5},
        title: output.title,
        lang: "en-UK",
        creator: `EDPS Website Evidence Collector v${output.script.version.npm} using NPM html-to-docx`,
    };

    try {
        let docx = await HTMLtoDOCX(html_dump, null, documentOptions, null)
        fs.writeFileSync(path.join(outputFile), docx);
    } catch (e) {
        console.error(e);
    }
}

async function generatePdf(outputFile: string, html_dump: string) {
    const browser = await puppeteer.launch({});
    const pages = await browser.pages();
    await pages[0].setContent(html_dump);
    await pages[0].pdf({
        path: path.resolve(path.join(outputFile)),
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
            <div class="page-footer" style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
                <div style="bottom: 5px; text-align: center;"><span class="title"></span></div>
            </div>
          `,
        footerTemplate: `
            <div class="page-header" style="width: 100%; font-size: 11px; padding: 5px 5px 0; position: relative;">
                <div style="top: 5px; text-align: center;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>
            </div>
          `,
        // this is needed to prevent content from being placed over the footer
        margin: {top: '1.5cm', bottom: '1cm'},
    })
    await browser.close();
}