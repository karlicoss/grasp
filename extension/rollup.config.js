import assert from 'assert'
import fs from 'fs'
const { globSync } = import('node:fs')
import path from 'path'
import { fileURLToPath } from 'url'

import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'

import {generateManifest} from './generate_manifest.js'


const env = {
    RELEASE: process.env.RELEASE,
    PUBLISH: process.env.PUBLISH,
    MANIFEST: process.env.MANIFEST,
}

const target = process.env.TARGET; assert(target)
const manifest_version = process.env.MANIFEST; assert(manifest_version)
const ext_id = process.env.EXT_ID; assert(ext_id)
const release = env.RELEASE === 'YES' // TODO use --environment=production for rollup?
const publish = env.PUBLISH === 'YES'


const thisDir = path.dirname(fileURLToPath(import.meta.url)); assert(path.isAbsolute(thisDir))
const srcDir = path.join(thisDir, 'src')
const buildDir = path.join(thisDir, 'dist', target)


// kinda annoying it's not a builtin..
function cleanOutputDir() {
    return {
        name: 'clean-output-dir',
        buildStart(options) {
            const outDir = buildDir
            // we don't just want to rm -rf outputDir to respect if it's a symlink or something like that
            if (!fs.existsSync(outDir)) {
                return
            }
            fs.readdirSync(outDir).forEach(f => {
                // console.debug("removing %s", f)
                fs.rmSync(path.join(outDir, f), {recursive: true})
            })
        },
    }
}


function generateManifestPlugin() {
    return {
        name: 'generate-manifest',
        generateBundle(outputOptions, bundle) {
            const manifest = generateManifest({
                target: target,
                version: manifest_version,
                release: release,
                ext_id: ext_id,
            })
            const mjs = JSON.stringify(manifest, null, 2)
            const outputPath = path.join(outputOptions.dir, 'manifest.json')
            fs.mkdirSync(outputOptions.dir, { recursive: true })
            fs.writeFileSync(outputPath, mjs, 'utf8')
        }
    }
}


const compile = inputs => { return {
    input: inputs,
    output: {
        dir: buildDir,
        // format: 'esm', //  default??
        // format: 'iife',  // inlines? e.g. could use for bg page if we disable splitting..

        // huh! so if I build all files in one go, it figures out the shared files properly it seems
        // however it still inlines webextension stuff into one of the files? e.g. common
        manualChunks: id => {  // ugh, seems a bit shit?
            if (id.includes('webextension-polyfill')) {
                return 'webextension-polyfill' // move it in a separate chunk
            }
        },
   },
   plugins: [
       cleanOutputDir(),
       copy({
         targets: [
           {src: 'src/**/*.html', dest: buildDir},
           {src: 'src/**/*.png' , dest: buildDir},
         ],
         flatten: false,
       }),
       typescript({
           outDir: buildDir,
           noEmitOnError: true,  // fail on errors
       }),
       commonjs(),  // needed for webext polyfill
       nodeResolve(),
       generateManifestPlugin(),
   ],
}}


export default [
    compile([
        path.join(srcDir, 'background.ts'),
        path.join(srcDir, 'options_page.ts'),
        path.join(srcDir, 'popup.ts'),
        path.join(srcDir, 'detect_dark_mode.ts'),
    ]),
]
