import 'core-js/fn/object/assign'
import WebFont from 'webfontloader'
import fileType from 'file-type'
import supportsWoff2 from 'woff2-feature-test'

function load(config = {}, version = 0, log = false) {
    return new Promise((resolve, reject) => {
        const savedFonts = localStorage ? JSON.parse(localStorage.getItem('saved-fonts')) : null;
        const savedFontsVersion = localStorage ? localStorage.getItem('saved-fonts-version') : null;
        if (savedFonts && savedFonts.length && version.toString() === savedFontsVersion) {
            log && console.log(`Get Fonts from Local Storage, Version ${savedFontsVersion}`);
            setFonts(savedFonts);
            resolve();
        } else {
            log && console.log(`Load Fonts, Version ${version}`);
            WebFont.load({
                ...config, active: () => {
                    parseStyleTags(version);
                    resolve();
                }
            });
        }
    });
}

function parseStyleTags(version) {
    const docStyleSheets = document.styleSheets;
    const styleSheets = [...docStyleSheets];
    let rules = [];
    styleSheets.forEach(tag => {
        if (tag.rules) rules.push(...tag.rules)
    });
    rules = rules.filter(rule => rule instanceof CSSFontFaceRule);
    rules = [].concat(...rules.map(rule => parseRules(rule)));
    rules = rules.map(rule => setPreferedFont(rule));
    rules = rules.filter(rule => rule);
    const promises = rules.map(rule => loadFont(rule));
    Promise.all(promises).then(fonts => onFontsLoaded(fonts, version));
}

function onFontsLoaded(fonts, version) {
    const usedFonts = fonts.map(font => font.name);
    return Promise
        .all(fonts.map(font => saveFont(font)))
        .then(() => {
            localStorage.setItem('saved-fonts', JSON.stringify(usedFonts));
            localStorage.setItem('saved-fonts-version', version);
        })
        .catch(error => console.error(error));
}

function parseRules(rule) {
    const fonts = [];
    const nameRegex = /font-family:\s?['"]?(.*?)['"]?;/g;
    const urlRegex = /url\(["']?(\S*?)["']?\)/g;
    const formatRegex = /format\(["']?(.*?)["']?\)/g;

    const name = nameRegex.exec(rule.cssText);

    if (!name || !name[1]) return null;

    let url;
    let format;
    while ((url = urlRegex.exec(rule.cssText)) && (format = formatRegex.exec(rule.cssText))) {
        fonts.push({
            url: url[1],
            format: format[1]
        })
    }

    return { name: name[1], fonts };
}

function setPreferedFont(rule) {
    const woff2 = rule.fonts.find(font => font.format === 'woff2');
    if (supportsWoff2 && woff2) {
        return {
            name: rule.name,
            url: woff2.url
        }
    }

    const woff = rule.fonts.find(font => font.format === 'woff');
    if (woff) {
        return {
            name: rule.name,
            url: woff.url
        }
    }

    rule.fonts.forEach(font => console.warn(`Font format "${font.format}" is not supported`));
    return null;
}

function loadFont({ name, url }) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                const reader = response.body.getReader();
                reader.read().then(({ done, value }) => {
                    resolve({ name, buffer: value });
                });
            })
            .catch(error => console.error(error));
    })
}

function saveFont(font) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([font.buffer], { type: fileType(font.buffer).mime });
        const reader = new FileReader();
        reader.onload = event => {
            const base64 = event.target.result;
            localStorage.setItem(font.name, base64);
            resolve();
        };
        reader.readAsDataURL(blob);
    });
}

function setFonts(savedFonts) {
    savedFonts.forEach(font => readFont(font));
}

function readFont(font) {
    const base64String = localStorage.getItem(font);
    setStyleTag(base64String);
}

function setStyleTag(base64String) {
    const style = document.createElement('style');
    style.rel = 'stylesheet';
    style.textContent = `@font-face {font-family: font-name;  src: url(${base64String});}`;
    document.head.appendChild(style);
}

export { load };